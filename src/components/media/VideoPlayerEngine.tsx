// =============================================================================
// VideoPlayerEngine
// Real HTML5 video player with load/play/pause/stop/seek/restart/fullscreen.
// Designed to be used both inside control panels and passive displays.
// =============================================================================

import { useCallback, useEffect, useRef, useState, memo } from 'react';
import {
  Play, Pause, Square, SkipBack, Maximize, Minimize,
  Volume2, VolumeX, Loader2, AlertCircle, Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export interface VideoPlayerState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'ended' | 'error';
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  mediaId: string | null;
  errorMessage: string | null;
}

interface VideoPlayerEngineProps {
  /** Signed URL or direct URL for the video */
  src: string | null;
  /** Media item ID for state tracking */
  mediaId?: string | null;
  /** Called on every state change */
  onStateChange?: (state: VideoPlayerState) => void;
  /** Called when video ends */
  onEnded?: () => void;
  /** Hide controls (for passive display mode) */
  hideControls?: boolean;
  /** Auto-play when src changes */
  autoplay?: boolean;
  /** Poster image URL */
  poster?: string | null;
  /** CSS class for container */
  className?: string;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const VideoPlayerEngine = memo(function VideoPlayerEngine({
  src,
  mediaId = null,
  onStateChange,
  onEnded,
  hideControls = false,
  autoplay = false,
  poster = null,
  className = '',
}: VideoPlayerEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  const [status, setStatus] = useState<VideoPlayerState['status']>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // RAF loop for smooth time updates
  const startTimeLoop = useCallback(() => {
    const tick = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimeLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  }, []);

  // Notify state changes
  useEffect(() => {
    onStateChange?.({
      status,
      currentTime,
      duration,
      volume,
      isMuted,
      isFullscreen,
      mediaId,
      errorMessage,
    });
  }, [status, currentTime, duration, volume, isMuted, isFullscreen, mediaId, errorMessage, onStateChange]);

  // Load video when src changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    stopTimeLoop();

    if (!src) {
      video.removeAttribute('src');
      video.load();
      setStatus('idle');
      setCurrentTime(0);
      setDuration(0);
      setErrorMessage(null);
      return;
    }

    setStatus('loading');
    setErrorMessage(null);
    video.src = src;
    video.load();

    if (autoplay) {
      video.play().catch(() => {
        // Autoplay blocked — user must interact
        setStatus('paused');
      });
    }
  }, [src, autoplay, stopTimeLoop]);

  // Sync volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopTimeLoop();
    };
  }, [stopTimeLoop]);

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (status === 'loading') {
        setStatus('paused');
      }
    }
  }, [status]);

  const handlePlay = useCallback(() => {
    setStatus('playing');
    startTimeLoop();
  }, [startTimeLoop]);

  const handlePause = useCallback(() => {
    if (status !== 'stopped') {
      setStatus('paused');
    }
    stopTimeLoop();
  }, [status, stopTimeLoop]);

  const handleEnded = useCallback(() => {
    setStatus('ended');
    stopTimeLoop();
    onEnded?.();
  }, [stopTimeLoop, onEnded]);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    const msg = video?.error?.message ?? 'Erro ao carregar vídeo';
    setStatus('error');
    setErrorMessage(msg);
    stopTimeLoop();
  }, [stopTimeLoop]);

  const handleCanPlay = useCallback(() => {
    if (status === 'loading') {
      setStatus('paused');
    }
  }, [status]);

  // Control functions
  const play = useCallback(() => {
    videoRef.current?.play().catch(() => setStatus('error'));
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      setStatus('stopped');
      setCurrentTime(0);
      stopTimeLoop();
    }
  }, [stopTimeLoop]);

  const restart = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      setCurrentTime(0);
      video.play().catch(() => setStatus('error'));
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video && isFinite(time)) {
      video.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(video.currentTime);
    }
  }, [duration]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className={`relative bg-black rounded-lg overflow-hidden group ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        poster={poster ?? undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onCanPlay={handleCanPlay}
      />

      {/* Overlay: loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}

      {/* Overlay: idle */}
      {status === 'idle' && !src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-2">
          <Film className="h-12 w-12" />
          <p className="text-sm">Nenhum vídeo carregado</p>
        </div>
      )}

      {/* Overlay: error */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2 bg-black/70">
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Controls */}
      {!hideControls && src && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress bar */}
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={([v]) => {
              if (duration > 0) seek((v / 100) * duration);
            }}
            className="mb-3"
          />

          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            {status === 'playing' ? (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={pause}>
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={play}>
                <Play className="h-4 w-4" />
              </Button>
            )}

            {/* Stop */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>

            {/* Restart */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={restart}>
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* Time */}
            <span className="text-xs text-white/70 font-mono tabular-nums ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleMute}>
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={([v]) => { setVolume(v / 100); setIsMuted(false); }}
              className="w-20"
            />

            {/* Fullscreen */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
