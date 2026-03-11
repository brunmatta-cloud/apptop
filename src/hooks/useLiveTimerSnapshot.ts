import { useEffect, useMemo, useState } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

export const useLiveTimerSnapshot = () => {
  const { remoteState, timerSnapshot } = useSyncStore();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (remoteState.timerStatus !== 'running') {
      setNowMs(Date.now());
      return;
    }

    let animationFrame = 0;
    const tick = () => {
      setNowMs(Date.now());
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    remoteState.timerStatus,
    remoteState.startedAt,
    remoteState.momentStartedAt,
    remoteState.accumulatedMs,
    remoteState.momentAccumulatedMs,
    remoteState.currentIndex,
    remoteState.activeCultoId,
  ]);

  return useMemo(() => (
    remoteState.timerStatus === 'running'
      ? getTimerSnapshot(remoteState, nowMs)
      : timerSnapshot
  ), [nowMs, remoteState, timerSnapshot]);
};
