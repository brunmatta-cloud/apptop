// =============================================================================
// AudioPlayerEngine
// Internal audio player with queue management, controls, and state sync.
// This is the core player component that manages HTML5 Audio element.
// =============================================================================

import { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Repeat, Shuffle, ListMusic, X, Music, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SongQueueItem } from '@/domains/platform/types';

interface AudioPlayerEngineProps {
  /** Initial queue to load */
  initialQueue?: SongQueueItem[];
  /** Called when player state changes */
  onStateChange?: (state: AudioPlayerState) => void;
  /** Called to get signed URL for a song */
  getAudioUrl: (songId: string) => Promise<string | null>;
  /** Compact mode for sidebars */
  compact?: boolean;
}

export interface AudioPlayerState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
  currentSong: SongQueueItem | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: SongQueueItem[];
  queueIndex: number;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const AudioPlayerEngine = memo(function AudioPlayerEngine({
  initialQueue = [],
  onStateChange,
  getAudioUrl,
  compact = false,
}: AudioPlayerEngineProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<SongQueueItem[]>(initialQueue);
  const [queueIndex, setQueueIndex] = useState(0);
  const [status, setStatus] = useState<AudioPlayerState['status']>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const animationRef = useRef<number>();

  const currentSong = queue[queueIndex] ?? null;

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update external state
  useEffect(() => {
    onStateChange?.({
      status,
      currentSong,
      currentTime,
      duration,
      volume,
      isMuted,
      queue,
      queueIndex,
    });
  }, [status, currentSong, currentTime, duration, volume, isMuted, queue, queueIndex, onStateChange]);

  // RAF loop for smooth time updates
  const startTimeTracking = useCallback(() => {
    const update = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
  }, []);

  const stopTimeTracking = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  // Load and play a specific song
  const loadAndPlay = useCallback(async (index: number) => {
    const song = queue[index];
    if (!song || !audioRef.current) return;

    setStatus('loading');
    setQueueIndex(index);
    stopTimeTracking();

    const url = await getAudioUrl(song.song_id);
    if (!url) {
      setStatus('error');
      return;
    }

    const audio = audioRef.current;
    audio.src = url;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.onended = () => {
      stopTimeTracking();
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
        startTimeTracking();
      } else if (index < queue.length - 1) {
        loadAndPlay(index + 1);
      } else {
        setStatus('stopped');
      }
    };

    audio.onerror = () => {
      setStatus('error');
      stopTimeTracking();
    };

    try {
      await audio.play();
      setStatus('playing');
      startTimeTracking();
    } catch {
      setStatus('error');
    }
  }, [queue, getAudioUrl, isRepeat, startTimeTracking, stopTimeTracking]);

  // Controls
  const play = useCallback(() => {
    if (!audioRef.current) return;
    if (status === 'idle' || status === 'stopped') {
      loadAndPlay(queueIndex);
    } else {
      audioRef.current.play();
      setStatus('playing');
      startTimeTracking();
    }
  }, [status, queueIndex, loadAndPlay, startTimeTracking]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setStatus('paused');
    stopTimeTracking();
  }, [stopTimeTracking]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setStatus('stopped');
    setCurrentTime(0);
    stopTimeTracking();
  }, [stopTimeTracking]);

  const next = useCallback(() => {
    if (queueIndex < queue.length - 1) {
      loadAndPlay(queueIndex + 1);
    }
  }, [queueIndex, queue.length, loadAndPlay]);

  const prev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (queueIndex > 0) {
      loadAndPlay(queueIndex - 1);
    }
  }, [queueIndex, loadAndPlay]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const toggleRepeat = useCallback(() => setIsRepeat((r) => !r), []);

  // External queue management
  const addToQueue = useCallback((song: SongQueueItem) => {
    setQueue((q) => [...q, song]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
    if (index < queueIndex) setQueueIndex((i) => i - 1);
    else if (index === queueIndex) stop();
  }, [queueIndex, stop]);

  // Update queue from props
  useEffect(() => {
    if (initialQueue.length > 0 && queue.length === 0) {
      setQueue(initialQueue);
    }
  }, [initialQueue]);

  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const hasQueue = queue.length > 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        {/* Song info */}
        <div className="flex-1 min-w-0">
          {currentSong ? (
            <div>
              <p className="text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist ?? ''}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma música</p>
          )}
        </div>
        {/* Compact controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev} disabled={!hasQueue}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={isPlaying ? pause : play}
            disabled={!hasQueue}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
              isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next} disabled={queueIndex >= queue.length - 1}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Now Playing */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {currentSong ? (
              <>
                <p className="font-medium truncate">{currentSong.title}</p>
                <p className="text-sm text-muted-foreground truncate">{currentSong.artist ?? 'Artista desconhecido'}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma música selecionada</p>
            )}
          </div>
          {hasQueue && (
            <Badge variant="outline" className="shrink-0">
              {queueIndex + 1}/{queue.length}
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={([v]) => seek((v / 100) * duration)}
            className="cursor-pointer"
            disabled={!currentSong}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost" size="icon" className="h-9 w-9"
            onClick={toggleRepeat}
          >
            <Repeat className={`h-4 w-4 ${isRepeat ? 'text-primary' : ''}`} />
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={prev} disabled={!hasQueue}>
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default" size="icon" className="h-11 w-11 rounded-full"
            onClick={isPlaying ? pause : play}
            disabled={!hasQueue && status === 'idle'}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> :
              isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          <Button
            variant="ghost" size="icon" className="h-9 w-9"
            onClick={next}
            disabled={queueIndex >= queue.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost" size="icon" className="h-9 w-9"
            onClick={() => setShowQueue((s) => !s)}
          >
            <ListMusic className={`h-4 w-4 ${showQueue ? 'text-primary' : ''}`} />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 px-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
            {isMuted || volume === 0
              ? <VolumeX className="h-4 w-4" />
              : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => { setVolume(v / 100); if (isMuted) setIsMuted(false); }}
            className="flex-1"
          />
        </div>
      </div>

      {/* Queue */}
      {showQueue && (
        <div className="border-t">
          <div className="px-4 py-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Fila ({queue.length})</h3>
          </div>
          <ScrollArea className="max-h-[200px]">
            <div className="px-2 pb-2 space-y-0.5">
              {queue.map((item, idx) => (
                <div
                  key={`${item.song_id}-${idx}`}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors
                    ${idx === queueIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
                  onClick={() => loadAndPlay(idx)}
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">
                    {idx === queueIndex && isPlaying ? '▶' : idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{item.title}</p>
                    {item.artist && <p className="text-xs text-muted-foreground truncate">{item.artist}</p>}
                  </div>
                  {item.duration_seconds && (
                    <span className="text-xs text-muted-foreground">{formatTime(item.duration_seconds)}</span>
                  )}
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {queue.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">Fila vazia</p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
});

export default AudioPlayerEngine;
