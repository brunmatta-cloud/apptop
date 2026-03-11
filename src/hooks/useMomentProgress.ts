import { useMemo } from 'react';
import type { MomentoProgramacao } from '@/types/culto';
import { formatSecondsLabel, formatTimerMs, quantizeRemainingMs } from '@/utils/time';

export const useMomentProgress = (momento: MomentoProgramacao | null, elapsedMs: number) => useMemo(() => {
  const totalSeconds = momento?.duracao ? momento.duracao * 60 : 0;
  const totalMs = totalSeconds * 1000;
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const percent = totalMs > 0 ? Math.min(100, (safeElapsedMs / totalMs) * 100) : 0;
  const remainingMs = Math.max(0, totalMs - safeElapsedMs);
  const displayRemainingMs = quantizeRemainingMs(remainingMs);
  const remainingSeconds = Math.max(0, Math.ceil(displayRemainingMs / 1000));

  return {
    totalMs,
    percent,
    progressScale: percent / 100,
    remainingMs,
    displayRemainingMs,
    remainingSeconds,
    remainMin: Math.floor(remainingSeconds / 60),
    remainSec: remainingSeconds % 60,
    formattedRemaining: formatTimerMs(displayRemainingMs),
    remainingLabel: formatSecondsLabel(displayRemainingMs),
  };
}, [elapsedMs, momento]);
