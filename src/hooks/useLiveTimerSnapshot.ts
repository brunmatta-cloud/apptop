import { useEffect, useMemo, useRef } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';
import { useAlignedNow } from '@/hooks/useAlignedNow';

const ENABLE_TIMER_FLOW_DEBUG = false;

export const useLiveTimerSnapshot = () => {
  const { remoteState } = useSyncStore();
  const nowMs = useAlignedNow(remoteState.timerStatus === 'running');
  const lastRunningRef = useRef(false);
  const visualTickLoggedRef = useRef<string | null>(null);

  const snapshot = useMemo(() => getTimerSnapshot(remoteState, nowMs), [nowMs, remoteState]);

  useEffect(() => {
    const isRunning = remoteState.timerStatus === 'running';
    const globalTrace = (window as Window & {
      __timerFlowTrace?: {
        id: string;
        command: string;
        startedAtMs: number;
      } | null;
    }).__timerFlowTrace;

    if (!isRunning) {
      lastRunningRef.current = false;
      visualTickLoggedRef.current = null;
      return;
    }

    if (!lastRunningRef.current) {
      lastRunningRef.current = true;
      if (ENABLE_TIMER_FLOW_DEBUG) {
        console.info('[sync:timer-flow-visual-running]', {
          id: globalTrace?.id ?? null,
          command: globalTrace?.command ?? null,
          msFromCommand: globalTrace ? Date.now() - globalTrace.startedAtMs : null,
          elapsedMs: snapshot.elapsedMs,
          momentElapsedMs: snapshot.momentElapsedMs,
        });
      }
    }

    if (globalTrace && visualTickLoggedRef.current !== globalTrace.id && snapshot.momentElapsedMs > 0) {
      visualTickLoggedRef.current = globalTrace.id;
      if (ENABLE_TIMER_FLOW_DEBUG) {
        console.info('[sync:timer-flow-first-visual-tick]', {
          id: globalTrace.id,
          command: globalTrace.command,
          msFromCommand: Date.now() - globalTrace.startedAtMs,
          elapsedMs: snapshot.elapsedMs,
          momentElapsedMs: snapshot.momentElapsedMs,
        });
      }
    }
  }, [nowMs, remoteState.timerStatus, snapshot.elapsedMs, snapshot.momentElapsedMs]);

  return snapshot;
};
