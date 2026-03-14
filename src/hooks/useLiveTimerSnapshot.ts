import { useEffect, useMemo, useState } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

export const useLiveTimerSnapshot = () => {
  const { remoteState } = useSyncStore();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [remoteState.timerStatus, remoteState.startedAt, remoteState.accumulatedMs]);

  useEffect(() => {
    if (remoteState.timerStatus !== 'running') {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [remoteState.timerStatus]);

  return useMemo(() => {
    return remoteState.timerStatus === 'running'
      ? getTimerSnapshot(remoteState, nowMs)
      : getTimerSnapshot(remoteState);
  }, [nowMs, remoteState, remoteState.timerStatus]);
};