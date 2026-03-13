import { useEffect, useMemo, useState } from 'react';
import { useLiveRemoteState } from '@/contexts/SyncStoreContext';
import { advanceLiveTimerBaseline, createLiveTimerBaseline, projectLiveTimerSnapshot } from '@/features/culto-sync/liveTimer';
import { LIVE_TICK_MS } from '@/utils/time';

export const useLiveTimerSnapshot = () => {
  const remoteState = useLiveRemoteState();
  const [baseline, setBaseline] = useState(() => createLiveTimerBaseline(remoteState));

  useEffect(() => {
    setBaseline(createLiveTimerBaseline(remoteState));
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
    if (!baseline.isRunning) {
      return;
    }

    const tick = () => {
      setBaseline((current) => advanceLiveTimerBaseline(current));
    };

    const intervalId = window.setInterval(tick, LIVE_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    baseline.isRunning,
  ]);

  return useMemo(() => projectLiveTimerSnapshot(baseline), [baseline]);
};
