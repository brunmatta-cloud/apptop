import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

const LIVE_TIMER_TICK_MS = 100;

let activeSubscribers = 0;
let activeInterval: number | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const ensureInterval = () => {
  if (activeInterval != null || typeof window === 'undefined') {
    return;
  }

  activeInterval = window.setInterval(() => {
    emit();
  }, LIVE_TIMER_TICK_MS);
};

const clearActiveInterval = () => {
  if (activeInterval == null || typeof window === 'undefined') {
    return;
  }

  window.clearInterval(activeInterval);
  activeInterval = null;
};

const subscribeClock = (listener: () => void) => {
  listeners.add(listener);
  activeSubscribers += 1;
  ensureInterval();

  return () => {
    listeners.delete(listener);
    activeSubscribers = Math.max(0, activeSubscribers - 1);

    if (activeSubscribers === 0) {
      clearActiveInterval();
    }
  };
};

const getClockSnapshot = () => Date.now();

const useSharedNowMs = (enabled: boolean) => {
  const nowMs = useSyncExternalStore(
    enabled ? subscribeClock : () => () => undefined,
    getClockSnapshot,
    getClockSnapshot,
  );

  useEffect(() => {
    if (enabled) {
      emit();
    }
  }, [enabled]);

  return enabled ? nowMs : Date.now();
};

export const useLiveTimerSnapshot = () => {
  const { remoteState } = useSyncStore();
  const isRunning = remoteState.timerStatus === 'running';
  const nowMs = useSharedNowMs(isRunning);

  return useMemo(() => {
    return getTimerSnapshot(remoteState, nowMs);
  }, [remoteState, nowMs]);
};
