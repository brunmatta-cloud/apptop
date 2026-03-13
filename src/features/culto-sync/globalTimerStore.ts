import React from 'react';
import type { TimerSnapshot } from '@/features/culto-sync/domain';
import { createLiveTimerProjection, projectLiveTimerSnapshot, type LiveTimerProjection } from '@/features/culto-sync/liveTimer';
import { getLiveRemoteStateSnapshot, getLiveServerNowMs, subscribeLiveRemoteStateStore } from '@/contexts/SyncStoreContext';

// Single app-wide timer: it rebases only when Supabase state changes and ticks locally between those changes.
let globalTimerProjectionStore: LiveTimerProjection = createLiveTimerProjection(getLiveRemoteStateSnapshot(), getLiveServerNowMs());
let globalTimerSnapshotStore: TimerSnapshot = projectLiveTimerSnapshot(globalTimerProjectionStore);
const globalTimerListeners = new Set<() => void>();
let globalTimerAnimationFrameId: number | null = null;
let globalTimerUnsubscribeRemote: (() => void) | null = null;
let globalTimerInitialized = false;
let globalTimerFocusCleanup: (() => void) | null = null;

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
  publishGlobalTimerSnapshot(projectLiveTimerSnapshot(globalTimerProjectionStore));
};

const rebaseGlobalTimerSnapshot = () => {
  globalTimerProjectionStore = createLiveTimerProjection(getLiveRemoteStateSnapshot(), getLiveServerNowMs());
  publishGlobalTimerSnapshot(projectLiveTimerSnapshot(globalTimerProjectionStore));
};

const stopGlobalTimerLoop = () => {
  if (globalTimerAnimationFrameId != null) {
    cancelAnimationFrame(globalTimerAnimationFrameId);
    globalTimerAnimationFrameId = null;
  }
};

const startGlobalTimerLoop = () => {
  if (globalTimerAnimationFrameId != null) {
    return;
  }

  const tick = () => {
    emitGlobalTimerSnapshot();
    if (getLiveRemoteStateSnapshot().timerStatus !== 'running') {
      stopGlobalTimerLoop();
      return;
    }
    globalTimerAnimationFrameId = requestAnimationFrame(tick);
  };

  emitGlobalTimerSnapshot();
  globalTimerAnimationFrameId = requestAnimationFrame(tick);
};

const syncGlobalTimerLoop = () => {
  rebaseGlobalTimerSnapshot();

  if (globalTimerProjectionStore.isRunning) {
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
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const handleWake = () => {
      syncGlobalTimerLoop();
    };
    window.addEventListener('focus', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    globalTimerFocusCleanup = () => {
      window.removeEventListener('focus', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
  }
  syncGlobalTimerLoop();
};

export const disposeGlobalTimerStore = () => {
  stopGlobalTimerLoop();
  if (globalTimerUnsubscribeRemote) {
    globalTimerUnsubscribeRemote();
    globalTimerUnsubscribeRemote = null;
  }
  if (globalTimerFocusCleanup) {
    globalTimerFocusCleanup();
    globalTimerFocusCleanup = null;
  }
  globalTimerInitialized = false;
  globalTimerProjectionStore = createLiveTimerProjection(getLiveRemoteStateSnapshot(), getLiveServerNowMs());
  globalTimerSnapshotStore = projectLiveTimerSnapshot(globalTimerProjectionStore);
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
