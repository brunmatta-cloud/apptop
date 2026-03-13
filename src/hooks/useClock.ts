import { useCallback, useSyncExternalStore } from 'react';
import { getLiveServerNowMs, subscribeLiveRemoteStateStore } from '@/contexts/SyncStoreContext';

const CLOCK_TICK_MS = 1000;

let currentClockSnapshot = new Date(getLiveServerNowMs());
const clockListeners = new Set<() => void>();
let clockIntervalId: ReturnType<typeof setInterval> | null = null;
let clockRemoteUnsubscribe: (() => void) | null = null;
let clockSubscriberCount = 0;

const publishClockSnapshot = () => {
  currentClockSnapshot = new Date(getLiveServerNowMs());
  clockListeners.forEach((listener) => listener());
};

const stopClockLoop = () => {
  if (clockIntervalId != null) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }
};

const ensureClockStore = () => {
  if (!clockRemoteUnsubscribe) {
    clockRemoteUnsubscribe = subscribeLiveRemoteStateStore(() => {
      publishClockSnapshot();
    });
  }

  if (clockIntervalId != null) {
    return;
  }

  publishClockSnapshot();
  clockIntervalId = setInterval(() => {
    publishClockSnapshot();
  }, CLOCK_TICK_MS);
};

const cleanupClockStore = () => {
  if (clockSubscriberCount > 0) {
    return;
  }

  stopClockLoop();

  if (clockRemoteUnsubscribe) {
    clockRemoteUnsubscribe();
    clockRemoteUnsubscribe = null;
  }
}

const subscribeClockStore = (listener: () => void) => {
  clockSubscriberCount += 1;
  clockListeners.add(listener);
  ensureClockStore();

  return () => {
    clockListeners.delete(listener);
    clockSubscriberCount = Math.max(0, clockSubscriberCount - 1);
    cleanupClockStore();
  };
};

export function useClock() {
  const currentTime = useSyncExternalStore(
    subscribeClockStore,
    () => currentClockSnapshot,
    () => currentClockSnapshot,
  );

  const formatTime = useCallback(
    (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`,
    [],
  );

  return { currentTime, formatTime };
}
