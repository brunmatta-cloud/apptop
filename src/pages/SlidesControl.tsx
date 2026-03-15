// =============================================================================
// SlidesControl — Mobile-first passador simples.
// Route: /slides-control
// Large NEXT/PREV buttons, slide counter, preview, anti-double-click.
// Connects to session runtime via SlidesCommands.
// =============================================================================

import { useCallback, useMemo, useState, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Clapperboard, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePlayerStates } from '@/domains/platform/hooks';
import { SlidesCommands } from '@/domains/platform/command-service';
import { useLiveCultoView } from '@/contexts/CultoContext';

const DEBOUNCE_MS = 300;

export default function SlidesControl() {
  const cultoView = useLiveCultoView();
  const sessionId = cultoView?.culto?.id ?? null;
  const currentMoment = cultoView?.currentMoment ?? null;
  const isLive = cultoView?.isLive ?? false;

  const { data: playerStates } = usePlayerStates(sessionId);
  const slidesState = useMemo(
    () => playerStates?.find((p) => p.player_type === 'slides') ?? null,
    [playerStates],
  );

  // Anti-double-click
  const lastActionRef = useRef(0);
  const [isSending, setIsSending] = useState(false);

  const debounced = useCallback(async (action: () => Promise<unknown>) => {
    const now = Date.now();
    if (now - lastActionRef.current < DEBOUNCE_MS) return;
    lastActionRef.current = now;
    setIsSending(true);
    try {
      await action();
    } finally {
      setIsSending(false);
    }
  }, []);

  const onNext = useCallback(() => {
    if (!sessionId) return;
    debounced(() => SlidesCommands.next(sessionId));
  }, [sessionId, debounced]);

  const onPrev = useCallback(() => {
    if (!sessionId) return;
    debounced(() => SlidesCommands.prev(sessionId));
  }, [sessionId, debounced]);

  const onFirst = useCallback(() => {
    if (!sessionId) return;
    debounced(() => SlidesCommands.first(sessionId));
  }, [sessionId, debounced]);

  const onLast = useCallback(() => {
    if (!sessionId) return;
    debounced(() => SlidesCommands.last(sessionId));
  }, [sessionId, debounced]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <CardContent className="py-12 px-8 text-center text-muted-foreground">
            <Clapperboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma sessão ativa</p>
            <p className="text-sm mt-2">Inicie um culto para controlar slides.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Derive slide info from player_state queue_json or other fields
  const currentSlideIndex = slidesState?.current_time_seconds ?? 0; // overloaded for slide index
  const totalSlides = slidesState?.duration_seconds ?? 0; // overloaded for total slides

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-6 gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold flex items-center justify-center gap-2">
          <Clapperboard className="h-5 w-5" /> Passador de Slides
        </h1>
        {currentMoment && (
          <p className="text-sm text-muted-foreground mt-1">
            {currentMoment.atividade}
          </p>
        )}
      </div>

      {/* Slide counter */}
      <div className="text-center">
        <span className="text-6xl font-mono font-bold tabular-nums text-primary">
          {Math.floor(currentSlideIndex) + 1}
        </span>
        {totalSlides > 0 && (
          <span className="text-3xl font-mono text-muted-foreground ml-2">/ {Math.floor(totalSlides)}</span>
        )}
      </div>

      {/* Status */}
      {slidesState && (
        <p className="text-sm text-muted-foreground capitalize">
          {slidesState.status === 'idle' ? 'Nenhum slide carregado' : slidesState.status}
        </p>
      )}

      {/* Main navigation buttons */}
      <div className="flex items-center gap-4 w-full max-w-md">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 h-24 text-lg font-semibold gap-2"
          onClick={onPrev}
          disabled={isSending}
        >
          <ChevronLeft className="h-8 w-8" />
          Anterior
        </Button>
        <Button
          variant="default"
          size="lg"
          className="flex-1 h-24 text-lg font-semibold gap-2"
          onClick={onNext}
          disabled={isSending}
        >
          Próximo
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* Secondary actions */}
      <div className="flex gap-3">
        <Button variant="ghost" size="sm" onClick={onFirst} disabled={isSending} className="gap-1">
          <ChevronsLeft className="h-4 w-4" /> Primeiro
        </Button>
        <Button variant="ghost" size="sm" onClick={onLast} disabled={isSending} className="gap-1">
          Último <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Sending indicator */}
      {isSending && (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
