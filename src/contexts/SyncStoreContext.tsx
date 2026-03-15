import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Culto, ExecutionMode, ModeradorCallStatus, MomentoProgramacao } from '@/types/culto';
import type { ConnectionStatus, CronometroSettings, RemoteCultoState, UiSyncState } from '@/features/culto-sync/domain';
import {
  advanceCultoTransition,
  backCultoTransition,
  defaultRemoteState,
  finishCultoTransition,
  getActiveCulto,
  getActiveMomentos,
  getCurrentMoment,
  getMomentStatus,
  getTimerSnapshot,
  pauseCultoTransition,
  resumeCultoTransition,
  startCultoTransition,
  withMutationMetadata,
} from '@/features/culto-sync/domain';
import { getServerNow, getSessionState, sendSessionCommand, subscribeSessionState } from '@/features/culto-sync/service';
import { LIVE_TICK_MS } from '@/utils/time';

interface SyncStoreContextValue {
  remoteState: RemoteCultoState;
  uiState: UiSyncState;
  actorId: string;
  refreshFromServer: (reason?: string) => Promise<void>;
  runCommand: (actionKey: string, command: string, payload?: Record<string, unknown>) => Promise<void>;
}

type SyncCommandContextValue = Omit<SyncStoreContextValue, 'remoteState'>;

const SyncCommandContext = createContext<SyncCommandContextValue | null>(null);
let liveRemoteStateSnapshot: RemoteCultoState = defaultRemoteState;
const getPerfNowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
let liveServerClockBaselineMs = Date.now();
let liveServerPerfBaselineMs = getPerfNowMs();
let liveServerBestRoundTripMs = Number.POSITIVE_INFINITY;
const liveRemoteStateListeners = new Set<() => void>();

const publishLiveRemoteState = (state: RemoteCultoState) => {
  liveRemoteStateSnapshot = state;
  liveRemoteStateListeners.forEach((listener) => listener());
};

const subscribeLiveRemoteState = (listener: () => void) => {
  liveRemoteStateListeners.add(listener);
  return () => {
    liveRemoteStateListeners.delete(listener);
  };
};

export const getLiveRemoteStateSnapshot = () => liveRemoteStateSnapshot;
export const subscribeLiveRemoteStateStore = subscribeLiveRemoteState;
export const getLiveServerNowMs = () => {
  const elapsedMs = Math.max(0, getPerfNowMs() - liveServerPerfBaselineMs);
  return liveServerClockBaselineMs + elapsedMs;
};

const REFRESH_INTERVAL_MS = 5000;
const OFFLINE_GRACE_MS = 30000;
const POST_COMMAND_REFRESH_DELAY_MS = LIVE_TICK_MS;
const TIMER_COMMANDS = new Set(['start', 'resume', 'pause', 'advance', 'skip', 'back', 'finish']);
const ENABLE_TIMER_FLOW_DEBUG = false;

const createActorId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `actor-${Math.random().toString(36).slice(2, 10)}`;
};

const logSync = (scope: string, detail: Record<string, unknown> = {}) => {
  console.info(`[sync:${scope}]`, detail);
};

const logTimerFlow = (scope: string, detail: Record<string, unknown> = {}) => {
  if (!ENABLE_TIMER_FLOW_DEBUG) return;
  console.info(`[sync:${scope}]`, detail);
};

type ServerClockSample = {
  midpointPerfMs: number;
  serverNowMs?: number;
  roundTripMs?: number;
};

type TimerFlowTrace = {
  id: string;
  command: string;
  startedAtMs: number;
  expectedRevision: number;
  optimisticAppliedAtMs?: number;
  rpcResolvedAtMs?: number;
  realtimeAppliedAtMs?: number;
  confirmRefreshAtMs?: number;
};

const getStateFingerprint = (state: RemoteCultoState) => JSON.stringify({
  revision: state.revision,
  updatedAt: state.updatedAt,
  updatedBy: state.updatedBy,
  status: state.status,
  activeCultoId: state.activeCultoId,
  currentIndex: state.currentIndex,
  executionMode: state.executionMode,
  timerStatus: state.timerStatus,
  currentCommand: state.currentCommand,
  nextCommand: state.nextCommand,
  currentStage: state.currentStage,
  startedAt: state.startedAt,
  momentStartedAt: state.momentStartedAt,
  accumulatedMs: state.accumulatedMs,
  momentAccumulatedMs: state.momentAccumulatedMs,
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      candidate.code,
      candidate.message,
      candidate.details,
      candidate.hint,
    ].filter((value) => typeof value === 'string' && value.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  return fallback;
};

const updateServerClockBaseline = (
  state: RemoteCultoState,
  receivedPerfMs: number,
  calibrationSample?: ServerClockSample,
) => {
  const serverUpdatedAtMs = Date.parse(state.updatedAt);
  const currentEstimatedServerNowMs = liveServerClockBaselineMs + Math.max(0, receivedPerfMs - liveServerPerfBaselineMs);
  const calibratedServerNowMs = calibrationSample?.serverNowMs;
  const calibratedPerfNowMs = calibrationSample?.midpointPerfMs;
  const nextServerNowMs = Math.max(
    Number.isFinite(calibratedServerNowMs) ? Number(calibratedServerNowMs) : Number.NEGATIVE_INFINITY,
    Number.isFinite(serverUpdatedAtMs) ? serverUpdatedAtMs : Number.NEGATIVE_INFINITY,
    currentEstimatedServerNowMs,
  );

  if (!Number.isFinite(nextServerNowMs) || nextServerNowMs <= 0) {
    return;
  }

  liveServerClockBaselineMs = nextServerNowMs;
  liveServerPerfBaselineMs = Number.isFinite(calibratedPerfNowMs) ? Number(calibratedPerfNowMs) : receivedPerfMs;
  if (Number.isFinite(calibrationSample?.roundTripMs)) {
    liveServerBestRoundTripMs = Math.min(liveServerBestRoundTripMs, Number(calibrationSample?.roundTripMs));
  }
};

const didCommandTakeEffect = (command: string, state: RemoteCultoState) => {
  switch (command) {
    case 'start':
      return getActiveCulto(state).status === 'em_andamento';
    case 'pause':
      return state.timerStatus === 'paused';
    case 'resume':
      return state.timerStatus === 'running';
    case 'finish':
      return getActiveCulto(state).status === 'finalizado' || state.timerStatus === 'finished';
    default:
      return false;
  }
};

const getOptimisticTransitionState = (
  state: RemoteCultoState,
  command: string,
  actorId: string,
  nowIso: string,
  nowMs: number,
) => {
  let result = null as ReturnType<typeof startCultoTransition> | null;

  switch (command) {
    case 'start':
      result = startCultoTransition(state, nowIso);
      break;
    case 'pause':
      result = pauseCultoTransition(state, nowIso, nowMs);
      break;
    case 'resume':
      result = resumeCultoTransition(state, nowIso);
      break;
    case 'advance':
    case 'skip':
      result = advanceCultoTransition(state, nowIso, nowMs);
      break;
    case 'back':
      result = backCultoTransition(state, nowIso, nowMs);
      break;
    case 'finish':
      result = finishCultoTransition(state, nowIso, nowMs);
      break;
    default:
      return null;
  }

  if (!result?.ok) {
    return null;
  }

  return withMutationMetadata(result.state, actorId, nowIso);
};

const getNextConnectionStatus = ({
  hasSuccessfulSync,
  realtimeState,
  consecutiveFailures,
  lastSuccessAt,
}: {
  hasSuccessfulSync: boolean;
  realtimeState: string;
  consecutiveFailures: number;
  lastSuccessAt: number | null;
}): ConnectionStatus => {
  if (!hasSuccessfulSync) {
    return consecutiveFailures > 0 ? 'degraded' : 'connecting';
  }

  if (consecutiveFailures >= 2 && lastSuccessAt && Date.now() - lastSuccessAt > OFFLINE_GRACE_MS) {
    return 'offline';
  }

  if (realtimeState === 'SUBSCRIBED') {
    return 'online';
  }

  return 'degraded';
};

export const SyncStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const actorIdRef = useRef(createActorId());
  const remoteStateRef = useRef<RemoteCultoState>(defaultRemoteState);
  const fingerprintRef = useRef(getStateFingerprint(defaultRemoteState));
  const autoAdvanceRevisionRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const realtimeStatusRef = useRef('CONNECTING');
  const lastSuccessfulSyncAtRef = useRef<number | null>(null);
  const consecutiveRefreshFailuresRef = useRef(0);
  const hasSuccessfulSyncRef = useRef(false);
  const clockCalibrationInFlightRef = useRef<Promise<void> | null>(null);
  const timerFlowTraceRef = useRef<TimerFlowTrace | null>(null);
  const runCommandRef = useRef<SyncStoreContextValue['runCommand'] | null>(null);
  const [uiState, setUiState] = useState<UiSyncState>({
    isHydrating: true,
    isSubmitting: false,
    pendingAction: null,
    lastError: null,
    connectionStatus: 'connecting',
  });
  const queueRef = useRef(Promise.resolve());
  const commandCooldownRef = useRef<Record<string, number>>({});

  const updateConnectionStatus = useCallback((nextStatus?: string) => {
    if (nextStatus) {
      realtimeStatusRef.current = nextStatus;
    }

    const resolved = getNextConnectionStatus({
      hasSuccessfulSync: hasSuccessfulSyncRef.current,
      realtimeState: realtimeStatusRef.current,
      consecutiveFailures: consecutiveRefreshFailuresRef.current,
      lastSuccessAt: lastSuccessfulSyncAtRef.current,
    });

    setUiState((current) => current.connectionStatus === resolved ? current : { ...current, connectionStatus: resolved });
  }, []);

  const sampleServerClockOnce = useCallback(async (): Promise<ServerClockSample | null> => {
    const startedPerfMs = getPerfNowMs();

    try {
      const serverNowMs = await getServerNow();
      const receivedPerfMs = getPerfNowMs();
      const roundTripMs = Math.max(0, receivedPerfMs - startedPerfMs);
      const midpointPerfMs = startedPerfMs + roundTripMs / 2;

      return {
        midpointPerfMs,
        serverNowMs,
        roundTripMs,
      };
    } catch {
      return null;
    }
  }, []);

  const calibrateServerClock = useCallback((sampleCount = 4) => {
    if (clockCalibrationInFlightRef.current) {
      return clockCalibrationInFlightRef.current;
    }

    const calibrationPromise = (async () => {
      const samples: ServerClockSample[] = [];

      for (let index = 0; index < sampleCount; index += 1) {
        const sample = await sampleServerClockOnce();
        if (sample?.serverNowMs != null) {
          samples.push(sample);
        }
      }

      if (samples.length === 0) {
        return;
      }

      const bestSample = samples.reduce((best, current) => {
        if ((current.roundTripMs ?? Number.POSITIVE_INFINITY) < (best.roundTripMs ?? Number.POSITIVE_INFINITY)) {
          return current;
        }
        return best;
      }, samples[0]);

      if ((bestSample.roundTripMs ?? Number.POSITIVE_INFINITY) > liveServerBestRoundTripMs) {
        return;
      }

      updateServerClockBaseline(remoteStateRef.current, getPerfNowMs(), bestSample);
    })()
      .finally(() => {
        clockCalibrationInFlightRef.current = null;
      });

    clockCalibrationInFlightRef.current = calibrationPromise;
    return calibrationPromise;
  }, [sampleServerClockOnce]);

  const syncAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    const current = remoteStateRef.current;
    const currentMoment = getCurrentMoment(current);

    if (
      current.executionMode !== 'automatico' ||
      current.timerStatus !== 'running' ||
      !currentMoment
    ) {
      autoAdvanceRevisionRef.current = null;
      return;
    }

    const snapshot = getTimerSnapshot(current, getLiveServerNowMs());
    const remainingMs = Math.max(0, currentMoment.duracao * 60 * 1000 - snapshot.momentElapsedMs);

    if (remainingMs > 0) {
      autoAdvanceRevisionRef.current = null;
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        const latest = remoteStateRef.current;
        if (
          latest.executionMode !== 'automatico' ||
          latest.timerStatus !== 'running' ||
          latest.revision !== current.revision
        ) {
          return;
        }
        runCommandRef.current?.('auto-advance', 'advance');
      }, Math.max(50, remainingMs));
      return;
    }

    if (autoAdvanceRevisionRef.current === current.revision) {
      return;
    }

    autoAdvanceRevisionRef.current = current.revision;
    runCommandRef.current?.('auto-advance', 'advance');
  }, []);

  const applyRemoteState = useCallback((
    next: RemoteCultoState,
    origin: string,
    serverClockSample?: ServerClockSample,
  ) => {
    const receivedAtMs = Date.now();
    const receivedPerfMs = getPerfNowMs();
    const nextFingerprint = getStateFingerprint(next);
    const currentFingerprint = fingerprintRef.current;

    if (next.revision < remoteStateRef.current.revision) {
      if (origin !== 'safety-poll') {
        logSync('stale-state-ignored', { origin, currentRevision: remoteStateRef.current.revision, nextRevision: next.revision });
      }
      return;
    }
    if (
      next.revision === remoteStateRef.current.revision &&
      next.updatedAt === remoteStateRef.current.updatedAt &&
      nextFingerprint === currentFingerprint
    ) {
      if (origin !== 'safety-poll') {
        logSync('duplicate-state-ignored', { origin, revision: next.revision, updatedAt: next.updatedAt });
      }
      return;
    }
    if (next.revision === remoteStateRef.current.revision && next.updatedAt < remoteStateRef.current.updatedAt) {
      if (origin !== 'safety-poll') {
        logSync('outdated-state-ignored', { origin, revision: next.revision, currentUpdatedAt: remoteStateRef.current.updatedAt, nextUpdatedAt: next.updatedAt });
      }
      return;
    }

    remoteStateRef.current = next;
    fingerprintRef.current = nextFingerprint;
    updateServerClockBaseline(next, receivedPerfMs, serverClockSample);
    publishLiveRemoteState(next);
    syncAutoAdvance();
    logSync('state-applied', { origin, revision: next.revision, timerStatus: next.timerStatus, currentCommand: next.currentCommand });

    const activeTrace = timerFlowTraceRef.current;
    if (activeTrace) {
      const nowMs = receivedAtMs;
      if (origin.endsWith(':optimistic') && activeTrace.optimisticAppliedAtMs == null) {
        activeTrace.optimisticAppliedAtMs = nowMs;
      }
      if (origin.endsWith(':rpc') && activeTrace.rpcResolvedAtMs == null) {
        activeTrace.rpcResolvedAtMs = nowMs;
      }
      if ((origin === 'realtime' || origin.endsWith(':confirm') || origin === 'realtime-subscribed') && activeTrace.realtimeAppliedAtMs == null) {
        activeTrace.realtimeAppliedAtMs = nowMs;
      }
      if (origin.endsWith(':confirm')) {
        activeTrace.confirmRefreshAtMs = nowMs;
      }

      logTimerFlow('timer-flow-state', {
        id: activeTrace.id,
        command: activeTrace.command,
        origin,
        currentRevision: next.revision,
        timerStatus: next.timerStatus,
        msFromCommand: nowMs - activeTrace.startedAtMs,
        msToOptimistic: activeTrace.optimisticAppliedAtMs != null ? activeTrace.optimisticAppliedAtMs - activeTrace.startedAtMs : null,
        msToRpc: activeTrace.rpcResolvedAtMs != null ? activeTrace.rpcResolvedAtMs - activeTrace.startedAtMs : null,
        msToRealtime: activeTrace.realtimeAppliedAtMs != null ? activeTrace.realtimeAppliedAtMs - activeTrace.startedAtMs : null,
        msToConfirm: activeTrace.confirmRefreshAtMs != null ? activeTrace.confirmRefreshAtMs - activeTrace.startedAtMs : null,
      });

      if (
        (activeTrace.command === 'start' || activeTrace.command === 'resume') &&
        next.timerStatus === 'running' &&
        (origin.endsWith(':optimistic') || origin.endsWith(':rpc') || origin === 'realtime' || origin.endsWith(':confirm'))
      ) {
        (window as Window & { __timerFlowTrace?: TimerFlowTrace | null }).__timerFlowTrace = activeTrace;
      }
    }
  }, [syncAutoAdvance]);

  const refreshFromServer = useCallback(async (reason = 'manual-refresh') => {
    try {
      const next = await getSessionState(remoteStateRef.current.sessionId);
      hasSuccessfulSyncRef.current = true;
      consecutiveRefreshFailuresRef.current = 0;
      lastSuccessfulSyncAtRef.current = Date.now();
      applyRemoteState(next, reason);
      if (reason === 'bootstrap' || reason === 'realtime-subscribed' || reason === 'realtime-reconnect') {
        void calibrateServerClock();
      }
      updateConnectionStatus();
      setUiState((current) => ({ ...current, isHydrating: false, lastError: null }));
    } catch (error) {
      consecutiveRefreshFailuresRef.current += 1;
      const message = getErrorMessage(error, 'Falha ao buscar estado oficial.');
      console.error(`[sync:${reason}]`, {
        error,
        message,
      });
      updateConnectionStatus();
      setUiState((current) => ({ ...current, isHydrating: false, lastError: message }));
    }
  }, [applyRemoteState, calibrateServerClock, updateConnectionStatus]);

  const runCommand = useCallback(async (actionKey: string, command: string, payload: Record<string, unknown> = {}) => {
    const COMMAND_COOLDOWN_MS = 300;
    const now = Date.now();
    const lastFired = commandCooldownRef.current[command] ?? 0;
    if (now - lastFired < COMMAND_COOLDOWN_MS) {
      logSync('command-throttled', { command, actionKey, cooldownMs: COMMAND_COOLDOWN_MS });
      return;
    }
    commandCooldownRef.current[command] = now;

    queueRef.current = queueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (uiState.isHydrating) {
          await refreshFromServer(`pre-command:${command}`);
        }

        const expectedRevision = remoteStateRef.current.revision;
        const baseState = remoteStateRef.current;
        const commandPayload = {
          ...payload,
          activeCultoId: baseState.activeCultoId,
        };

        setUiState((current) => ({
          ...current,
          isSubmitting: true,
          pendingAction: actionKey,
          lastError: null,
        }));

        try {
          const optimisticNowMs = getLiveServerNowMs();
          const optimisticNowIso = new Date(optimisticNowMs).toISOString();
          const isTimerCommand = TIMER_COMMANDS.has(command);
          if (TIMER_COMMANDS.has(command)) {
            const trace: TimerFlowTrace = {
              id: `${command}-${optimisticNowMs}`,
              command,
              startedAtMs: optimisticNowMs,
              expectedRevision,
            };
            timerFlowTraceRef.current = trace;
            (window as Window & { __timerFlowTrace?: TimerFlowTrace | null }).__timerFlowTrace = trace;
            logTimerFlow('timer-flow-command', {
              id: trace.id,
              command,
              expectedRevision,
              timerStatusBefore: baseState.timerStatus,
              currentIndexBefore: baseState.currentIndex,
            });
          }
          const optimisticState = getOptimisticTransitionState(
            baseState,
            command,
            actorIdRef.current,
            optimisticNowIso,
            optimisticNowMs,
          );

          if (optimisticState) {
            applyRemoteState(optimisticState, `${command}:optimistic`);
            if (isTimerCommand) {
              setUiState((current) => ({
                ...current,
                isSubmitting: false,
                pendingAction: null,
              }));
            }
          }

          const next = await sendSessionCommand({
            command,
            payload: commandPayload,
            expectedRevision,
            actor: actorIdRef.current,
            sessionId: remoteStateRef.current.sessionId,
          });
          hasSuccessfulSyncRef.current = true;
          consecutiveRefreshFailuresRef.current = 0;
          lastSuccessfulSyncAtRef.current = Date.now();
          applyRemoteState(next, `${command}:rpc`);
          void calibrateServerClock();
          updateConnectionStatus();
          window.setTimeout(() => {
            void refreshFromServer(`${command}:confirm`);
          }, POST_COMMAND_REFRESH_DELAY_MS);
        } catch (error) {
          const message = getErrorMessage(error, `Falha ao executar ${command}.`);
          console.error(`[sync:${command}]`, {
            error,
            message,
            payload: commandPayload,
            expectedRevision,
            revision: remoteStateRef.current.revision,
            activeCultoId: remoteStateRef.current.activeCultoId,
            actor: actorIdRef.current,
          });
          await refreshFromServer(`${command}:rollback`);
          if (TIMER_COMMANDS.has(command)) {
            logTimerFlow('timer-flow-error', {
              id: timerFlowTraceRef.current?.id,
              command,
              msFromCommand: timerFlowTraceRef.current ? Date.now() - timerFlowTraceRef.current.startedAtMs : null,
            });
          }
          setUiState((current) => ({
            ...current,
            lastError: didCommandTakeEffect(command, remoteStateRef.current) ? null : message,
          }));
        } finally {
          setUiState((current) => (
            current.isSubmitting || current.pendingAction != null
              ? {
                  ...current,
                  isSubmitting: false,
                  pendingAction: null,
                }
              : current
          ));
        }
      });

    return queueRef.current;
  }, [applyRemoteState, calibrateServerClock, refreshFromServer, uiState.isHydrating, updateConnectionStatus]);

  runCommandRef.current = runCommand;

  useEffect(() => {
    void refreshFromServer('bootstrap');

    const unsubscribe = subscribeSessionState(
      remoteStateRef.current.sessionId,
      (next) => applyRemoteState(next, 'realtime'),
      (status) => {
        logSync('realtime-status', { status });
        if (status === 'SUBSCRIBED') {
          void refreshFromServer('realtime-subscribed');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          void refreshFromServer('realtime-reconnect');
        }
        updateConnectionStatus(status);
      },
    );

    const interval = window.setInterval(() => {
      void refreshFromServer('safety-poll');
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [applyRemoteState, refreshFromServer, updateConnectionStatus]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleWake = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      void calibrateServerClock();
    };

    window.addEventListener('focus', handleWake);
    document.addEventListener('visibilitychange', handleWake);

    return () => {
      window.removeEventListener('focus', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
  }, [calibrateServerClock]);

  const commandValue = useMemo<SyncCommandContextValue>(() => ({
    uiState,
    actorId: actorIdRef.current,
    refreshFromServer,
    runCommand,
  }), [refreshFromServer, runCommand, uiState]);

  return (
    <SyncCommandContext.Provider value={commandValue}>
      {children}
    </SyncCommandContext.Provider>
  );
};

export const useSyncStore = () => {
  const context = useContext(SyncCommandContext);
  if (!context) {
    throw new Error('useSyncStore must be used within SyncStoreProvider');
  }
  const remoteState = useLiveRemoteState();
  return useMemo(() => ({
    remoteState,
    ...context,
  }), [context, remoteState]);
};

export const useSyncCommands = () => {
  const context = useContext(SyncCommandContext);
  if (!context) {
    throw new Error('useSyncCommands must be used within SyncStoreProvider');
  }
  return context;
};

export const useLiveRemoteState = () => {
  return React.useSyncExternalStore(
    subscribeLiveRemoteState,
    () => liveRemoteStateSnapshot,
    () => liveRemoteStateSnapshot,
  );
};

export const useCeremonySession = () => {
  const { remoteState, uiState, runCommand } = useSyncStore();
  const culto = getActiveCulto(remoteState);
  const momentos = getActiveMomentos(remoteState);

  const run = (actionKey: string, command: string, payload?: Record<string, unknown>) => {
    void runCommand(actionKey, command, payload);
  };

  return {
    remoteState,
    culto,
    momentos,
    uiState,
    currentIndex: remoteState.currentIndex,
    executionMode: remoteState.executionMode,
    isPaused: remoteState.timerStatus === 'paused',
    cultos: remoteState.cultos,
    allMomentos: remoteState.allMomentos,
    getMomentStatus: (index: number) => getMomentStatus(remoteState, index),
    iniciarCulto: () => run('start', 'start'),
    pausar: () => run('pause', 'pause'),
    retomar: () => run('resume', 'resume'),
    avancar: () => run('advance', 'advance'),
    voltar: () => run('back', 'back'),
    pular: () => run('skip', 'skip'),
    finalizarCulto: () => run('finish', 'finish'),
    toggleModeradorRelease: (active: boolean) => run('toggle-moderador-release', 'toggle_moderador_release', { active }),
    updateModeradorStatus: (id: string, status: ModeradorCallStatus) => run('update-moderador-status', 'update_moderador_status', { id, status }),
    marcarChamado: (id: string) => run('mark-called', 'mark_called', { id }),
    adjustCurrentMomentDuration: (deltaSeconds: number) => run('adjust-duration', 'adjust_duration', { deltaSeconds }),
    setExecutionMode: (mode: ExecutionMode) => run('set-execution-mode', 'set_execution_mode', { mode }),
    setActiveCultoId: (id: string) => run('set-active-culto', 'set_active_culto', { id }),
    setCulto: (value: React.SetStateAction<Culto>) => {
      const nextCulto = typeof value === 'function' ? value(culto as Culto) : value;
      run('set-culto', 'set_culto', { id: nextCulto.id, culto: nextCulto });
    },
    setMomentos: (value: React.SetStateAction<MomentoProgramacao[]>) => {
      const nextMomentos = typeof value === 'function' ? value(momentos) : value;
      run('set-momentos', 'set_momentos', { momentos: nextMomentos });
    },
    addCulto: (cultoInput: Culto) => run('add-culto', 'add_culto', { culto: cultoInput }),
    updateCulto: (cultoInput: Culto) => run('update-culto', 'update_culto', { culto: cultoInput }),
    removeCulto: (id: string) => run('remove-culto', 'remove_culto', { id }),
    duplicateCulto: (id: string) => {
      const original = remoteState.cultos.find((item) => item.id === id);
      if (!original) return;
      const newId = crypto.randomUUID();
      const momentosOriginais = remoteState.allMomentos[id] ?? [];
      run('duplicate-culto', 'duplicate_culto', {
        culto: { ...original, id: newId, nome: `${original.nome} (Copia)`, status: 'planejado' },
        momentos: momentosOriginais.map((momento) => ({
          ...momento,
          id: crypto.randomUUID(),
          cultoId: newId,
          chamado: false,
          duracaoOriginal: undefined,
        })),
      });
    },
    addMomento: (momento: MomentoProgramacao) => run('set-momentos', 'set_momentos', {
      momentos: [...momentos, momento].sort((a, b) => a.ordem - b.ordem),
    }),
    updateMomento: (momento: MomentoProgramacao) => run('set-momentos', 'set_momentos', {
      momentos: momentos
        .map((existing) => existing.id === momento.id ? momento : existing)
        .sort((a, b) => a.ordem - b.ordem),
    }),
    removeMomento: (id: string) => run('set-momentos', 'set_momentos', {
      momentos: momentos.filter((momento) => momento.id !== id),
    }),
    updateSettings: (patch: Partial<CronometroSettings>) => run('patch-settings', 'patch_settings', { patch }),
  };
};
