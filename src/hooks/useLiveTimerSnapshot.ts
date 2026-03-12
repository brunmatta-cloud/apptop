import { useEffect, useMemo, useState } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

export const useLiveTimerSnapshot = () => {
  const { remoteState } = useSyncStore();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [
    remoteState.timerStatus,
    remoteState.startedAt,
    remoteState.accumulatedMs,
    remoteState.momentStartedAt,
    remoteState.momentAccumulatedMs,
    remoteState.currentIndex,
    remoteState.activeCultoId,
  ]);

  useEffect(() => {
    if (remoteState.timerStatus !== 'running') {
      setNowMs(Date.now());
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    remoteState.timerStatus,
    remoteState.startedAt,
    remoteState.accumulatedMs,
    remoteState.momentStartedAt,
    remoteState.momentAccumulatedMs,
    remoteState.currentIndex,
    remoteState.activeCultoId,
  ]);

  return useMemo(() => (
    remoteState.timerStatus === 'running'
      ? getTimerSnapshot(remoteState, nowMs)
      : getTimerSnapshot(remoteState)
  ), [nowMs, remoteState]);
};
