import { useEffect, useMemo, useState } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

export const useLiveTimerSnapshot = () => {
  const { remoteState } = useSyncStore();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const now = Date.now();
    setNowMs(now);
  }, [
    remoteState.timerStatus,
    remoteState.startedAt,
    remoteState.momentStartedAt,
    remoteState.accumulatedMs,
    remoteState.momentAccumulatedMs,
    remoteState.currentIndex,
    remoteState.activeCultoId,
  ]);

  useEffect(() => {
    if (remoteState.timerStatus !== 'running') {
      return;
    }

    const tick = () => {
      setNowMs(Date.now());
    };

    tick();

    const interval = window.setInterval(tick, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    remoteState.timerStatus,
    remoteState.startedAt,
    remoteState.momentStartedAt,
  ]);

  return useMemo(() => {
    return getTimerSnapshot(remoteState, nowMs);
  }, [remoteState, nowMs]);
};
