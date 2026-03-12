import { useEffect, useMemo, useState } from 'react';
import { getLiveServerNowMs, useLiveRemoteState } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

export const useLiveTimerSnapshot = () => {
  const remoteState = useLiveRemoteState();
  const [nowMs, setNowMs] = useState(() => getLiveServerNowMs());

  useEffect(() => {
    setNowMs(getLiveServerNowMs());
  }, [
    remoteState.timerStatus,
    remoteState.startedAt,
    remoteState.momentStartedAt,
    remoteState.accumulatedMs,
    remoteState.momentAccumulatedMs,
    remoteState.currentIndex,
    remoteState.activeCultoId,
    remoteState.updatedAt,
  ]);

  useEffect(() => {
    if (remoteState.timerStatus !== 'running') {
      return;
    }

    let frameId = 0;

    const tick = () => {
      setNowMs(getLiveServerNowMs());
      frameId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [
    remoteState.timerStatus,
    remoteState.startedAt,
    remoteState.momentStartedAt,
    remoteState.updatedAt,
  ]);

  return useMemo(() => getTimerSnapshot(remoteState, nowMs), [remoteState, nowMs]);
};
