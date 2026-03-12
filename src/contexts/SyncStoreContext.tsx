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
import { getSessionState, sendSessionCommand, subscribeSessionState } from '@/features/culto-sync/service';
import { LIVE_TICK_MS } from '@/utils/time';

interface SyncStoreContextValue {
  remoteState: RemoteCultoState;
  uiState: UiSyncState;
  actorId: string;
  refreshFromServer: (reason?: string) => Promise<void>;
  runCommand: (actionKey: string, command: string, payload?: Record<string, unknown>) => Promise<void>;
}

const SyncStoreContext = createContext<SyncStoreContextValue | null>(null);
const REFRESH_INTERVAL_MS = 500;
const OFFLINE_GRACE_MS = 30000;
const POST_COMMAND_REFRESH_DELAY_MS = LIVE_TICK_MS;

const createActorId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `actor-${Math.random().toString(36).slice(2, 10)}`;
};

const logSync = (scope: string, detail: Record<string, unknown> = {}) => {
  console.info(`[sync:${scope}]`, detail);
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
  cultos: state.cultos,
  allMomentos: state.allMomentos,
  settings: state.settings,
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
  const realtimeStatusRef = useRef('CONNECTING');
  const lastSuccessfulSyncAtRef = useRef<number | null>(null);
  const consecutiveRefreshFailuresRef = useRef(0);
  const hasSuccessfulSyncRef = useRef(false);
  const [remoteState, setRemoteState] = useState<RemoteCultoState>(defaultRemoteState);
  const [uiState, setUiState] = useState<UiSyncState>({
    isHydrating: true,
    isSubmitting: false,
    pendingAction: null,
    lastError: null,
    connectionStatus: 'connecting',
  });
  const queueRef = useRef(Promise.resolve());

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

  const applyRemoteState = useCallback((next: RemoteCultoState, origin: string) => {
    const nextFingerprint = getStateFingerprint(next);
    const currentFingerprint = fingerprintRef.current;

    if (next.revision < remoteStateRef.current.revision) {
      logSync('stale-state-ignored', { origin, currentRevision: remoteStateRef.current.revision, nextRevision: next.revision });
      return;
    }
    if (
      next.revision === remoteStateRef.current.revision &&
      next.updatedAt === remoteStateRef.current.updatedAt &&
      nextFingerprint === currentFingerprint
    ) {
      logSync('duplicate-state-ignored', { origin, revision: next.revision, updatedAt: next.updatedAt });
      return;
    }
    if (next.revision === remoteStateRef.current.revision && next.updatedAt < remoteStateRef.current.updatedAt) {
      logSync('outdated-state-ignored', { origin, revision: next.revision, currentUpdatedAt: remoteStateRef.current.updatedAt, nextUpdatedAt: next.updatedAt });
      return;
    }

    remoteStateRef.current = next;
    fingerprintRef.current = nextFingerprint;
    setRemoteState(next);
    logSync('state-applied', { origin, revision: next.revision, timerStatus: next.timerStatus, currentCommand: next.currentCommand });
  }, []);

  const refreshFromServer = useCallback(async (reason = 'manual-refresh') => {
    try {
      const next = await getSessionState(remoteStateRef.current.sessionId);
      hasSuccessfulSyncRef.current = true;
      consecutiveRefreshFailuresRef.current = 0;
      lastSuccessfulSyncAtRef.current = Date.now();
      applyRemoteState(next, reason);
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
  }, [applyRemoteState, updateConnectionStatus]);

  const runCommand = useCallback(async (actionKey: string, command: string, payload: Record<string, unknown> = {}) => {
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
          const optimisticNowMs = Date.now();
          const optimisticNowIso = new Date(optimisticNowMs).toISOString();
          const optimisticState = getOptimisticTransitionState(
            baseState,
            command,
            actorIdRef.current,
            optimisticNowIso,
            optimisticNowMs,
          );

          if (optimisticState) {
            applyRemoteState(optimisticState, `${command}:optimistic`);
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
          setUiState((current) => ({
            ...current,
            lastError: didCommandTakeEffect(command, remoteStateRef.current) ? null : message,
          }));
        } finally {
          setUiState((current) => ({
            ...current,
            isSubmitting: false,
            pendingAction: null,
          }));
        }
      });

    return queueRef.current;
  }, [applyRemoteState, refreshFromServer, uiState.isHydrating, updateConnectionStatus]);

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

    const snapshot = getTimerSnapshot(current);
    const remainingMs = Math.max(0, currentMoment.duracao * 60 * 1000 - snapshot.momentElapsedMs);
    if (remainingMs > 0) {
      autoAdvanceRevisionRef.current = null;
      const timeoutId = window.setTimeout(() => {
        const latest = remoteStateRef.current;
        if (
          latest.executionMode !== 'automatico' ||
          latest.timerStatus !== 'running' ||
          latest.revision !== current.revision
        ) {
          return;
        }
        void runCommand('auto-advance', 'advance');
      }, Math.max(50, remainingMs));

      return () => window.clearTimeout(timeoutId);
    }

    autoAdvanceRevisionRef.current = current.revision;
    void runCommand('auto-advance', 'advance');
  }, [remoteState, runCommand]);

  const value = useMemo<SyncStoreContextValue>(() => ({
    remoteState,
    uiState,
    actorId: actorIdRef.current,
    refreshFromServer,
    runCommand,
  }), [refreshFromServer, remoteState, runCommand, uiState]);

  return <SyncStoreContext.Provider value={value}>{children}</SyncStoreContext.Provider>;
};

export const useSyncStore = () => {
  const context = useContext(SyncStoreContext);
  if (!context) {
    throw new Error('useSyncStore must be used within SyncStoreProvider');
  }
  return context;
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
      const nextCulto = typeof value === 'function' ? value(culto) : value;
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
