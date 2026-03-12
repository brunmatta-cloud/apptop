import { useMemo, useSyncExternalStore } from 'react';
import { subscribeLiveRemoteStateStore, getLiveRemoteStateSnapshot } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';

const TIMER_TICK_MS = 100;

let timerInterval: number | null = null;
let timerSubscribers = 0;
const timerListeners = new Set<() => void>();

const emitTimerTick = () => {
  timerListeners.forEach((listener) => listener());
};

const startTimerLoop = () => {
  if (timerInterval != null || typeof window === 'undefined') {
    return;
  }

  timerInterval = window.setInterval(() => {
    const state = getLiveRemoteStateSnapshot();
    if (state.timerStatus !== 'running') {
      return;
    }
    emitTimerTick();
  }, TIMER_TICK_MS);
};

const stopTimerLoop = () => {
  if (timerInterval == null || typeof window === 'undefined') {
    return;
  }

  window.clearInterval(timerInterval);
  timerInterval = null;
};

const subscribeTimerStore = (listener: () => void) => {
  const handleRemoteChange = () => {
    listener();

    if (getLiveRemoteStateSnapshot().timerStatus === 'running') {
      emitTimerTick();
    }
  };

  timerListeners.add(listener);
  timerSubscribers += 1;
  startTimerLoop();
  const unsubscribeRemote = subscribeLiveRemoteStateStore(handleRemoteChange);

  return () => {
    unsubscribeRemote();
    timerListeners.delete(listener);
    timerSubscribers = Math.max(0, timerSubscribers - 1);

    if (timerSubscribers === 0) {
      stopTimerLoop();
    }
  };
};

const getSnapshot = () => {
  const state = getLiveRemoteStateSnapshot();
  return getTimerSnapshot(state, Date.now());
};

export const useLiveTimerSnapshot = () => {
  const snapshot = useSyncExternalStore(subscribeTimerStore, getSnapshot, getSnapshot);

  return useMemo(() => snapshot, [snapshot]);
};
