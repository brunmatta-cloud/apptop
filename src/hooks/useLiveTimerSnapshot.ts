import { useEffect, useMemo, useRef, useState } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';
import type { RemoteCultoState } from '@/features/culto-sync/domain';
import { LIVE_TICK_MS } from '@/utils/time';

export const useLiveTimerSnapshot = () => {
  const { remoteState, timerSnapshot } = useSyncStore();
  const remoteStateRef = useRef<RemoteCultoState>(remoteState);
  const [liveSnapshot, setLiveSnapshot] = useState(() => getTimerSnapshot(remoteState, Date.now()));

  useEffect(() => {
    remoteStateRef.current = remoteState;
    setLiveSnapshot(getTimerSnapshot(remoteState, Date.now()));
  }, [
    remoteState,
    remoteState.revision,
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
      setLiveSnapshot(getTimerSnapshot(remoteState, Date.now()));
      return;
    }

    const tick = () => {
      setLiveSnapshot(getTimerSnapshot(remoteStateRef.current, Date.now()));
    };

    const now = Date.now();
    const remainder = now % LIVE_TICK_MS;
    const msUntilNextTick = remainder === 0 ? LIVE_TICK_MS : LIVE_TICK_MS - remainder;

    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, LIVE_TICK_MS);
    }, msUntilNextTick);

    return () => {
      window.clearTimeout(timeout);
      if (interval) {
        window.clearInterval(interval);
      }
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
      ? liveSnapshot
      : timerSnapshot
  ), [liveSnapshot, remoteState.timerStatus, timerSnapshot]);
};
