import React from 'react';
import type { TimerSnapshot } from '@/features/culto-sync/domain';
import { advanceLiveTimerBaseline, createLiveTimerBaseline, projectLiveTimerSnapshot, type LiveTimerBaseline } from '@/features/culto-sync/liveTimer';
import { getLiveRemoteStateSnapshot, subscribeLiveRemoteStateStore } from '@/contexts/SyncStoreContext';
import { LIVE_TICK_MS } from '@/utils/time';

// Single app-wide timer: it rebases only when Supabase state changes and ticks locally between those changes.
let globalTimerBaselineStore: LiveTimerBaseline = createLiveTimerBaseline(getLiveRemoteStateSnapshot());
let globalTimerSnapshotStore: TimerSnapshot = projectLiveTimerSnapshot(globalTimerBaselineStore);
const globalTimerListeners = new Set<() => void>();
let globalTimerIntervalId: ReturnType<typeof setInterval> | null = null;
let globalTimerUnsubscribeRemote: (() => void) | null = null;
let globalTimerInitialized = false;

const publishGlobalTimerSnapshot = (nextSnapshot: TimerSnapshot) => {
  if (
    nextSnapshot.elapsedMs === globalTimerSnapshotStore.elapsedMs &&
    nextSnapshot.momentElapsedMs === globalTimerSnapshotStore.momentElapsedMs &&
    nextSnapshot.isRunning === globalTimerSnapshotStore.isRunning
  ) {
    return;
  }

  globalTimerSnapshotStore = nextSnapshot;
  globalTimerListeners.forEach((listener) => listener());
};

const emitGlobalTimerSnapshot = () => {
  globalTimerBaselineStore = advanceLiveTimerBaseline(globalTimerBaselineStore);
  publishGlobalTimerSnapshot(projectLiveTimerSnapshot(globalTimerBaselineStore));
};

const rebaseGlobalTimerSnapshot = () => {
  globalTimerBaselineStore = createLiveTimerBaseline(getLiveRemoteStateSnapshot());
  publishGlobalTimerSnapshot(projectLiveTimerSnapshot(globalTimerBaselineStore));
};

const stopGlobalTimerLoop = () => {
  if (globalTimerIntervalId != null) {
    clearInterval(globalTimerIntervalId);
    globalTimerIntervalId = null;
  }
};

const startGlobalTimerLoop = () => {
  if (globalTimerIntervalId != null) {
    return;
  }

  const tick = () => {
    emitGlobalTimerSnapshot();
    if (getLiveRemoteStateSnapshot().timerStatus !== 'running') {
      stopGlobalTimerLoop();
    }
  };

  tick();
  globalTimerIntervalId = setInterval(tick, LIVE_TICK_MS);
};

const syncGlobalTimerLoop = () => {
  rebaseGlobalTimerSnapshot();

  if (globalTimerBaselineStore.isRunning) {
    startGlobalTimerLoop();
    return;
  }

  stopGlobalTimerLoop();
};

export const initializeGlobalTimerStore = () => {
  if (globalTimerInitialized) {
    syncGlobalTimerLoop();
    return;
  }

  globalTimerInitialized = true;
  globalTimerUnsubscribeRemote = subscribeLiveRemoteStateStore(() => {
    syncGlobalTimerLoop();
  });
  syncGlobalTimerLoop();
};

export const disposeGlobalTimerStore = () => {
  stopGlobalTimerLoop();
  if (globalTimerUnsubscribeRemote) {
    globalTimerUnsubscribeRemote();
    globalTimerUnsubscribeRemote = null;
  }
  globalTimerInitialized = false;
  globalTimerBaselineStore = createLiveTimerBaseline(getLiveRemoteStateSnapshot());
  globalTimerSnapshotStore = projectLiveTimerSnapshot(globalTimerBaselineStore);
};

const subscribeGlobalTimerSnapshot = (listener: () => void) => {
  globalTimerListeners.add(listener);
  initializeGlobalTimerStore();

  return () => {
    globalTimerListeners.delete(listener);
  };
};

export const getGlobalTimerSnapshot = () => globalTimerSnapshotStore;

export const useGlobalTimerSnapshot = () => React.useSyncExternalStore(
  subscribeGlobalTimerSnapshot,
  getGlobalTimerSnapshot,
  getGlobalTimerSnapshot,
);
