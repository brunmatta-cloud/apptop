import type { RemoteCultoState, TimerSnapshot } from '@/features/culto-sync/domain';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

export interface LiveTimerProjection {
  revision: number;
  isRunning: boolean;
  elapsedMsAtSync: number;
  momentElapsedMsAtSync: number;
  perfNowMsAtSync: number;
  serverNowMsAtSync: number;
}

const getPerfNowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const createLiveTimerProjection = (
  state: RemoteCultoState,
  serverNowMs: number,
  perfNowMs = getPerfNowMs(),
): LiveTimerProjection => {
  const snapshot = getTimerSnapshot(state, serverNowMs);

  return {
    revision: state.revision,
    isRunning: state.timerStatus === 'running',
    elapsedMsAtSync: snapshot.elapsedMs,
    momentElapsedMsAtSync: snapshot.momentElapsedMs,
    perfNowMsAtSync: perfNowMs,
    serverNowMsAtSync: serverNowMs,
  };
};

export const projectLiveTimerSnapshot = (
  projection: LiveTimerProjection,
  perfNowMs = getPerfNowMs(),
): TimerSnapshot => {
  const runningDeltaMs = projection.isRunning
    ? Math.max(0, perfNowMs - projection.perfNowMsAtSync)
    : 0;
  const elapsedMs = projection.elapsedMsAtSync + runningDeltaMs;
  const momentElapsedMs = projection.momentElapsedMsAtSync + runningDeltaMs;

  return {
    elapsedMs,
    momentElapsedMs,
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    momentElapsedSeconds: Math.floor(momentElapsedMs / 1000),
    isRunning: projection.isRunning,
  };
};
