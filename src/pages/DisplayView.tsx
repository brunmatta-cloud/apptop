// =============================================================================
// DisplayView — Full-screen display output page.
// Route: /display/:tipo (main, stage, audio, moderator)
// This page is meant to be displayed on a secondary screen/projector.
// It subscribes to realtime display state and renders accordingly.
// Integrates VideoPlayerEngine for video mode and SlidesPlayerEngine for slides.
// =============================================================================

import { useCallback, useEffect, useState, memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor, Radio } from 'lucide-react';
import { useDisplayOutputs, useDisplayState, usePlayerStates } from '@/domains/platform/hooks';
import { getSignedUrl } from '@/domains/platform/media-service';
import { VideoPlayerEngine } from '@/components/media/VideoPlayerEngine';
import { SlidesPlayerEngine } from '@/components/media/SlidesPlayerEngine';
import type { SlideItem } from '@/components/media/SlidesPlayerEngine';
import type { DisplayMode, DisplayType, MediaItem } from '@/domains/platform/types';
import { supabase } from '@/integrations/supabase/client';

const MODE_BACKGROUNDS: Record<DisplayMode, string> = {
  idle: 'bg-black',
  logo: 'bg-gradient-to-br from-slate-900 to-slate-950',
  message: 'bg-gradient-to-br from-blue-950 to-slate-950',
  video: 'bg-black',
  slides: 'bg-black',
  timeline: 'bg-gradient-to-br from-slate-900 to-slate-950',
  countdown: 'bg-gradient-to-br from-slate-900 to-blue-950',
  blackout: 'bg-black',
  custom: 'bg-black',
};

const LogoDisplay = memo(function LogoDisplay() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 animate-fade-in">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/20 backdrop-blur-xl">
        <Radio className="h-12 w-12 text-primary" />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">7Flow</h1>
        <p className="text-lg text-white/50">Sistema de Gestão ao Vivo</p>
      </div>
    </div>
  );
});

const MessageDisplay = memo(function MessageDisplay({ message }: { message: string | null }) {
  return (
    <div className="flex items-center justify-center p-12 animate-fade-in">
      <h1 className="text-5xl md:text-7xl font-bold text-white text-center leading-tight max-w-[80vw]">
        {message || ''}
      </h1>
    </div>
  );
});

const BlackoutDisplay = memo(function BlackoutDisplay() {
  return <div className="w-full h-full bg-black" />;
});

const IdleDisplay = memo(function IdleDisplay({ displayType }: { displayType: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-white/30">
      <Monitor className="h-16 w-16" />
      <div className="text-center">
        <p className="text-xl font-medium">Display: {displayType}</p>
        <p className="text-sm mt-1">Aguardando conteúdo...</p>
      </div>
    </div>
  );
});

const TimelineDisplay = memo(function TimelineDisplay() {
  return (
    <div className="flex items-center justify-center">
      <p className="text-2xl text-white/50">Linha do tempo (conectar com CultoContext)</p>
    </div>
  );
});

const CountdownDisplay = memo(function CountdownDisplay() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const date = new Date(now);
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex items-center justify-center">
      <span className="text-[15vw] font-mono font-bold text-white tabular-nums">
        {timeStr}
      </span>
    </div>
  );
});

// Resolves a media_item_id into a signed video URL
function useVideoUrl(mediaId: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setUrl(null);
      return;
    }

    let cancelled = false;

    (async () => {
      // Fetch the media item record to get bucket + path
      const { data } = await supabase
        .from('media_items')
        .select('storage_bucket, storage_path, remote_url')
        .eq('id', mediaId)
        .single();

      if (cancelled) return;

      if (data?.remote_url) {
        setUrl(data.remote_url);
        return;
      }

      if (data?.storage_bucket && data?.storage_path) {
        const signed = await getSignedUrl(data.storage_bucket, data.storage_path);
        if (!cancelled) setUrl(signed);
        return;
      }

      setUrl(null);
    })();

    return () => { cancelled = true; };
  }, [mediaId]);

  return url;
}

// Resolves a slides media_item_id into an array of SlideItem URLs
function useSlideUrls(mediaId: string | null): SlideItem[] {
  const [slides, setSlides] = useState<SlideItem[]>([]);

  useEffect(() => {
    if (!mediaId) {
      setSlides([]);
      return;
    }

    let cancelled = false;

    (async () => {
      // Fetch media item metadata
      const { data: item } = await supabase
        .from('media_items')
        .select('storage_bucket, storage_path, type')
        .eq('id', mediaId)
        .single();

      if (cancelled || !item) return;

      const bucket = item.storage_bucket ?? 'media-slides';
      const basePath = item.storage_path ?? '';

      // List files in the slides folder
      const { data: files } = await supabase.storage
        .from(bucket)
        .list(basePath, { sortBy: { column: 'name', order: 'asc' } });

      if (cancelled || !files?.length) {
        // Single image media item → treat the item itself as one slide
        if (item.storage_path) {
          const signed = await getSignedUrl(bucket, item.storage_path);
          if (!cancelled && signed) {
            setSlides([{ url: signed, label: 'Slide 1' }]);
          }
        }
        return;
      }

      // Generate signed URLs for each image file
      const imageFiles = files.filter((f) =>
        /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(f.name)
      );

      const slideItems: SlideItem[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const filePath = basePath ? `${basePath}/${imageFiles[i].name}` : imageFiles[i].name;
        const signed = await getSignedUrl(bucket, filePath);
        if (signed && !cancelled) {
          slideItems.push({ url: signed, label: `Slide ${i + 1}` });
        }
      }

      if (!cancelled) setSlides(slideItems);
    })();

    return () => { cancelled = true; };
  }, [mediaId]);

  return slides;
}

export default function DisplayView() {
  const { tipo } = useParams<{ tipo: string }>();
  const displayType = (tipo ?? 'main') as DisplayType;

  // Read session_id from URL search params (e.g. /display/main?session=xxx)
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || null;
  }, []);

  const { data: outputs } = useDisplayOutputs(sessionId);
  const targetOutput = useMemo(
    () => outputs?.find((o) => o.display_type === displayType) ?? null,
    [outputs, displayType],
  );
  const { data: displayState } = useDisplayState(targetOutput?.id ?? null);

  // Player state for video/slides sync
  const { data: playerStates } = usePlayerStates(sessionId);
  const videoPlayerState = useMemo(
    () => playerStates?.find((p) => p.player_type === 'video') ?? null,
    [playerStates],
  );
  const slidesPlayerState = useMemo(
    () => playerStates?.find((p) => p.player_type === 'slides') ?? null,
    [playerStates],
  );

  const mode: DisplayMode = displayState?.mode ?? 'idle';
  const bgClass = MODE_BACKGROUNDS[mode] ?? 'bg-black';

  // Resolve video URL from display_state.current_media_id or player_state
  const videoMediaId = displayState?.current_media_id ?? videoPlayerState?.current_media_id ?? null;
  const videoUrl = useVideoUrl(videoMediaId);

  // Resolve slides from display_state.current_media_id or player_state
  const slidesMediaId = displayState?.current_media_id ?? slidesPlayerState?.current_media_id ?? null;
  const slideItems = useSlideUrls(slidesMediaId);
  const slideIndex = displayState?.current_slide_index ?? 0;

  // Hide cursor after 3 seconds of inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const hide = () => {
      document.body.style.cursor = 'none';
    };
    const show = () => {
      document.body.style.cursor = 'default';
      clearTimeout(timer);
      timer = setTimeout(hide, 3000);
    };
    document.addEventListener('mousemove', show);
    timer = setTimeout(hide, 3000);
    return () => {
      document.removeEventListener('mousemove', show);
      clearTimeout(timer);
      document.body.style.cursor = 'default';
    };
  }, []);

  return (
    <div className={`fixed inset-0 ${bgClass} flex items-center justify-center overflow-hidden`}>
      {mode === 'idle' && <IdleDisplay displayType={displayType} />}
      {mode === 'logo' && <LogoDisplay />}
      {mode === 'message' && <MessageDisplay message={displayState?.custom_message ?? null} />}
      {mode === 'blackout' && <BlackoutDisplay />}
      {mode === 'timeline' && <TimelineDisplay />}
      {mode === 'countdown' && <CountdownDisplay />}
      {mode === 'video' && (
        <VideoPlayerEngine
          src={videoUrl}
          mediaId={videoMediaId}
          hideControls
          autoplay
          className="w-full h-full"
        />
      )}
      {mode === 'slides' && (
        <SlidesPlayerEngine
          slides={slideItems}
          mediaId={slidesMediaId}
          startIndex={slideIndex}
          hideControls
          className="w-full h-full"
        />
      )}
    </div>
  );
}
