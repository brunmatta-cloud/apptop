// =============================================================================
// SlidesPlayerEngine
// Real image-based slides viewer with navigation, preview, and state sync.
// Supports both control mode (with buttons) and display mode (passive).
// =============================================================================

import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, Image as ImageIcon, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SlideItem {
  url: string;
  label?: string;
}

export interface SlidesPlayerState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  currentIndex: number;
  totalSlides: number;
  mediaId: string | null;
  errorMessage: string | null;
}

interface SlidesPlayerEngineProps {
  /** Array of slide image URLs */
  slides: SlideItem[];
  /** Media item ID for state tracking */
  mediaId?: string | null;
  /** Starting slide index */
  startIndex?: number;
  /** Called on every state change */
  onStateChange?: (state: SlidesPlayerState) => void;
  /** Hide navigation controls (for passive display mode) */
  hideControls?: boolean;
  /** Show thumbnail strip */
  showThumbnails?: boolean;
  /** CSS class for container */
  className?: string;
}

export const SlidesPlayerEngine = memo(function SlidesPlayerEngine({
  slides,
  mediaId = null,
  startIndex = 0,
  onStateChange,
  hideControls = false,
  showThumbnails = false,
  className = '',
}: SlidesPlayerEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [status, setStatus] = useState<SlidesPlayerState['status']>(slides.length > 0 ? 'loading' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const totalSlides = slides.length;

  // Reset when slides array changes
  useEffect(() => {
    if (slides.length === 0) {
      setStatus('idle');
      setCurrentIndex(0);
      setLoadedImages(new Set());
      return;
    }
    setCurrentIndex(Math.min(startIndex, slides.length - 1));
    setStatus('loading');
    setLoadedImages(new Set());
    setErrorMessage(null);
  }, [slides, startIndex]);

  // Notify state changes
  useEffect(() => {
    onStateChange?.({
      status,
      currentIndex,
      totalSlides,
      mediaId,
      errorMessage,
    });
  }, [status, currentIndex, totalSlides, mediaId, errorMessage, onStateChange]);

  // Preload current + next slide
  useEffect(() => {
    if (slides.length === 0) return;

    const indicesToLoad = [currentIndex];
    if (currentIndex + 1 < slides.length) indicesToLoad.push(currentIndex + 1);
    if (currentIndex - 1 >= 0) indicesToLoad.push(currentIndex - 1);

    indicesToLoad.forEach((idx) => {
      if (loadedImages.has(idx)) return;
      const img = new window.Image();
      img.onload = () => {
        setLoadedImages((prev) => {
          const next = new Set(prev);
          next.add(idx);
          return next;
        });
        if (idx === currentIndex) {
          setStatus('ready');
        }
      };
      img.onerror = () => {
        if (idx === currentIndex) {
          setStatus('error');
          setErrorMessage(`Erro ao carregar slide ${idx + 1}`);
        }
      };
      img.src = slides[idx].url;
    });
  }, [currentIndex, slides, loadedImages]);

  const currentSlide = useMemo(() => slides[currentIndex] ?? null, [slides, currentIndex]);

  // Navigation
  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    if (clamped !== currentIndex) {
      setCurrentIndex(clamped);
      if (!loadedImages.has(clamped)) {
        setStatus('loading');
      } else {
        setStatus('ready');
      }
    }
  }, [slides.length, currentIndex, loadedImages]);

  const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);
  const first = useCallback(() => goTo(0), [goTo]);
  const last = useCallback(() => goTo(slides.length - 1), [goTo, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    if (hideControls) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        first();
      } else if (e.key === 'End') {
        e.preventDefault();
        last();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hideControls, next, prev, first, last]);

  // Idle state — no slides
  if (slides.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black text-white/30 gap-2 rounded-lg ${className}`}>
        <ImageIcon className="h-12 w-12" />
        <p className="text-sm">Nenhum slide carregado</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden flex flex-col ${className}`}>
      {/* Main slide area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0">
        {currentSlide && (
          <img
            src={currentSlide.url}
            alt={currentSlide.label ?? `Slide ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        )}

        {/* Loading overlay */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2 bg-black/70">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {!hideControls && (
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-black/80">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={first}
            disabled={currentIndex === 0}
          >
            <ChevronsLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={prev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <span className="text-white text-sm font-mono tabular-nums min-w-[60px] text-center">
            {currentIndex + 1} / {totalSlides}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={next}
            disabled={currentIndex >= totalSlides - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={last}
            disabled={currentIndex >= totalSlides - 1}
          >
            <ChevronsRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Thumbnail strip */}
      {showThumbnails && slides.length > 1 && (
        <div className="flex gap-1 px-2 py-1.5 bg-black/90 overflow-x-auto">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`flex-shrink-0 w-14 h-10 rounded border-2 overflow-hidden transition-colors ${
                idx === currentIndex ? 'border-primary' : 'border-transparent hover:border-white/30'
              }`}
            >
              <img
                src={slide.url}
                alt={slide.label ?? `Slide ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
