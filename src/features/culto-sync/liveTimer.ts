import type { RemoteCultoState, TimerSnapshot } from '@/features/culto-sync/domain';
import { getTimerSnapshot } from '@/features/culto-sync/domain';
import { LIVE_TICK_MS } from '@/utils/time';

export interface LiveTimerBaseline {
  isRunning: boolean;
  elapsedMs: number;
  momentElapsedMs: number;
}

const parseTimestamp = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAuthoritativeNowMs = (state: RemoteCultoState) => {
  return parseTimestamp(state.updatedAt)
    ?? parseTimestamp(state.pausedAt)
    ?? parseTimestamp(state.momentPausedAt)
    ?? parseTimestamp(state.startedAt)
    ?? parseTimestamp(state.momentStartedAt)
    ?? 0;
};

export const createLiveTimerBaseline = (
  state: RemoteCultoState,
  serverNowMs = getAuthoritativeNowMs(state),
): LiveTimerBaseline => {
  const snapshot = getTimerSnapshot(state, serverNowMs);

  return {
    isRunning: state.timerStatus === 'running',
    elapsedMs: snapshot.elapsedMs,
    momentElapsedMs: snapshot.momentElapsedMs,
  };
};

export const advanceLiveTimerBaseline = (
  baseline: LiveTimerBaseline,
  deltaMs = LIVE_TICK_MS,
): LiveTimerBaseline => {
  if (!baseline.isRunning) {
    return baseline;
  }

  return {
    ...baseline,
    elapsedMs: baseline.elapsedMs + deltaMs,
    momentElapsedMs: baseline.momentElapsedMs + deltaMs,
  };
};

export const projectLiveTimerSnapshot = (baseline: LiveTimerBaseline): TimerSnapshot => {
  const elapsedMs = baseline.elapsedMs;
  const momentElapsedMs = baseline.momentElapsedMs;

  return {
    elapsedMs,
    momentElapsedMs,
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    momentElapsedSeconds: Math.floor(momentElapsedMs / 1000),
    isRunning: baseline.isRunning,
  };
};
