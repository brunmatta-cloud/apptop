import React from 'react';
import type { Culto, ExecutionMode, ModeradorCallStatus, MomentStatus, MomentoProgramacao } from '@/types/culto';
import type { ConnectionStatus, RemoteCultoState, TimerSnapshot } from '@/features/culto-sync/domain';
import { getActiveCulto, getActiveMomentos, getMomentStatus, getTimerSnapshot } from '@/features/culto-sync/domain';
import { getLiveRemoteStateSnapshot, getLiveServerNowMs, subscribeLiveRemoteStateStore, useLiveRemoteState, useSyncCommands } from '@/contexts/SyncStoreContext';

interface CultoContextType {
  cultos: Culto[];
  addCulto: (c: Culto) => void;
  updateCulto: (c: Culto) => void;
  removeCulto: (id: string) => void;
  duplicateCulto: (id: string) => void;
  activeCultoId: string;
  setActiveCultoId: (id: string) => void;
  culto: Culto;
  setCulto: React.Dispatch<React.SetStateAction<Culto>>;
  momentos: MomentoProgramacao[];
  allMomentos: Record<string, MomentoProgramacao[]>;
  setMomentos: React.Dispatch<React.SetStateAction<MomentoProgramacao[]>>;
  currentIndex: number;
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  avancar: () => void;
  voltar: () => void;
  pausar: () => void;
  retomar: () => void;
  pular: () => void;
  iniciarCulto: () => void;
  finalizarCulto: () => void;
  moderadorReleaseActive: boolean;
  moderadorReleaseUpdatedAt: string | null;
  moderadorReleaseBy: string | null;
  moderadorReleasePendingMomentId: string | null;
  moderadorReleaseGrantedMomentId: string | null;
  toggleModeradorRelease: (active: boolean) => void;
  updateModeradorStatus: (id: string, status: ModeradorCallStatus) => void;
  getMomentStatus: (index: number) => MomentStatus;
  marcarChamado: (id: string) => void;
  addMomento: (m: MomentoProgramacao) => void;
  updateMomento: (m: MomentoProgramacao) => void;
  removeMomento: (id: string) => void;
  adjustCurrentMomentDuration: (deltaSeconds: number) => void;
  pendingAction: string | null;
  isSubmitting: boolean;
  lastError: string | null;
  connectionStatus: ConnectionStatus;
}

const CultoContext = React.createContext<CultoContextType | null>(null);

let globalTimerSnapshotStore: TimerSnapshot = getTimerSnapshot(getLiveRemoteStateSnapshot(), getLiveServerNowMs());
const globalTimerListeners = new Set<() => void>();
let globalTimerFrameId: number | null = null;
let globalTimerUnsubscribeRemote: (() => void) | null = null;
let globalTimerSubscriberCount = 0;

const emitGlobalTimerSnapshot = () => {
  const nextSnapshot = getTimerSnapshot(getLiveRemoteStateSnapshot(), getLiveServerNowMs());
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

const stopGlobalTimerLoop = () => {
  if (globalTimerFrameId != null) {
    window.cancelAnimationFrame(globalTimerFrameId);
    globalTimerFrameId = null;
  }
};

const startGlobalTimerLoop = () => {
  if (globalTimerFrameId != null) {
    return;
  }

  const tick = () => {
    emitGlobalTimerSnapshot();
    if (getLiveRemoteStateSnapshot().timerStatus === 'running' && globalTimerSubscriberCount > 0) {
      globalTimerFrameId = window.requestAnimationFrame(tick);
      return;
    }

    globalTimerFrameId = null;
  };

  globalTimerFrameId = window.requestAnimationFrame(tick);
};

const syncGlobalTimerLoop = () => {
  emitGlobalTimerSnapshot();

  if (getLiveRemoteStateSnapshot().timerStatus === 'running' && globalTimerSubscriberCount > 0) {
    startGlobalTimerLoop();
    return;
  }

  stopGlobalTimerLoop();
};

const ensureGlobalTimerStore = () => {
  if (globalTimerUnsubscribeRemote) {
    syncGlobalTimerLoop();
    return;
  }

  globalTimerUnsubscribeRemote = subscribeLiveRemoteStateStore(() => {
    syncGlobalTimerLoop();
  });

  syncGlobalTimerLoop();
};

const cleanupGlobalTimerStore = () => {
  if (globalTimerSubscriberCount > 0) {
    return;
  }

  stopGlobalTimerLoop();
  if (globalTimerUnsubscribeRemote) {
    globalTimerUnsubscribeRemote();
    globalTimerUnsubscribeRemote = null;
  }
  globalTimerSnapshotStore = getTimerSnapshot(getLiveRemoteStateSnapshot(), getLiveServerNowMs());
};

const subscribeGlobalTimerSnapshot = (listener: () => void) => {
  globalTimerSubscriberCount += 1;
  globalTimerListeners.add(listener);
  ensureGlobalTimerStore();

  return () => {
    globalTimerListeners.delete(listener);
    globalTimerSubscriberCount = Math.max(0, globalTimerSubscriberCount - 1);
    cleanupGlobalTimerStore();
  };
};

const useGlobalTimerSnapshot = () => React.useSyncExternalStore(
  subscribeGlobalTimerSnapshot,
  () => globalTimerSnapshotStore,
  () => globalTimerSnapshotStore,
);

const isInvalidStructuralSnapshot = (state: RemoteCultoState) => {
  const momentos = getActiveMomentos(state);
  const hasCurrentSelection = state.currentIndex >= 0;
  const missingMomentosWhileLive = (state.status === 'live' || state.timerStatus === 'running' || state.timerStatus === 'paused')
    && hasCurrentSelection
    && momentos.length === 0;
  const invalidCurrentIndex = hasCurrentSelection && state.currentIndex >= momentos.length;

  return missingMomentosWhileLive || invalidCurrentIndex;
};

const useStableLiveRemoteStateForView = () => {
  const remoteState = useLiveRemoteState();
  const stableStructureRef = React.useRef<Pick<RemoteCultoState, 'cultos' | 'activeCultoId' | 'allMomentos' | 'currentIndex'> | null>(null);

  const shouldReuseStructure = isInvalidStructuralSnapshot(remoteState) && stableStructureRef.current;

  const projectedState = React.useMemo(() => {
    if (!shouldReuseStructure || !stableStructureRef.current) {
      return remoteState;
    }

    return {
      ...remoteState,
      cultos: stableStructureRef.current.cultos,
      activeCultoId: stableStructureRef.current.activeCultoId,
      allMomentos: stableStructureRef.current.allMomentos,
      currentIndex: stableStructureRef.current.currentIndex,
    };
  }, [remoteState, shouldReuseStructure]);

  React.useEffect(() => {
    if (isInvalidStructuralSnapshot(remoteState)) {
      return;
    }

    stableStructureRef.current = {
      cultos: remoteState.cultos,
      activeCultoId: remoteState.activeCultoId,
      allMomentos: remoteState.allMomentos,
      currentIndex: remoteState.currentIndex,
    };
  }, [remoteState]);

  return projectedState;
};

export const CultoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uiState, runCommand } = useSyncCommands();

  const run = React.useCallback((actionKey: string, command: string, payload?: Record<string, unknown>) => {
    void runCommand(actionKey, command, payload);
  }, [runCommand]);

  const value = React.useMemo<CultoContextType>(() => ({
    cultos: [],
    addCulto: (cultoInput: Culto) => run('add-culto', 'add_culto', { culto: cultoInput }),
    updateCulto: (cultoInput: Culto) => run('update-culto', 'update_culto', { culto: cultoInput }),
    removeCulto: (id: string) => run('remove-culto', 'remove_culto', { id }),
    duplicateCulto: (id: string) => {
      const remoteState = getLiveRemoteStateSnapshot();
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
    activeCultoId: '',
    setActiveCultoId: (id: string) => run('set-active-culto', 'set_active_culto', { id }),
    culto: {
      id: '',
      nome: '',
      data: '',
      horarioInicial: '',
      duracaoPrevista: 0,
      status: 'planejado',
    },
    setCulto: (value: React.SetStateAction<Culto>) => {
      const remoteState = getLiveRemoteStateSnapshot();
      const currentCulto = getActiveCulto(remoteState);
      const nextCulto = typeof value === 'function' ? value(currentCulto) : value;
      run('set-culto', 'set_culto', { id: nextCulto.id, culto: nextCulto });
    },
    momentos: [],
    allMomentos: {},
    setMomentos: (value: React.SetStateAction<MomentoProgramacao[]>) => {
      const remoteState = getLiveRemoteStateSnapshot();
      const currentMomentos = getActiveMomentos(remoteState);
      const nextMomentos = typeof value === 'function' ? value(currentMomentos) : value;
      run('set-momentos', 'set_momentos', { momentos: nextMomentos });
    },
    currentIndex: -1,
    executionMode: 'manual',
    setExecutionMode: (mode: ExecutionMode) => run('set-execution-mode', 'set_execution_mode', { mode }),
    avancar: () => run('advance', 'advance'),
    voltar: () => run('back', 'back'),
    pausar: () => run('pause', 'pause'),
    retomar: () => run('resume', 'resume'),
    pular: () => run('skip', 'skip'),
    iniciarCulto: () => run('start', 'start'),
    finalizarCulto: () => run('finish', 'finish'),
    moderadorReleaseActive: false,
    moderadorReleaseUpdatedAt: null,
    moderadorReleaseBy: null,
    moderadorReleasePendingMomentId: null,
    moderadorReleaseGrantedMomentId: null,
    toggleModeradorRelease: (active: boolean) => run('toggle-moderador-release', 'toggle_moderador_release', { active }),
    updateModeradorStatus: (id: string, status: ModeradorCallStatus) => run('update-moderador-status', 'update_moderador_status', { id, status }),
    getMomentStatus: () => 'futuro',
    marcarChamado: (id: string) => run('mark-called', 'mark_called', { id }),
    addMomento: (momento: MomentoProgramacao) => {
      const remoteState = getLiveRemoteStateSnapshot();
      const currentMomentos = getActiveMomentos(remoteState);
      run('set-momentos', 'set_momentos', {
        momentos: [...currentMomentos, momento].sort((a, b) => a.ordem - b.ordem),
      });
    },
    updateMomento: (momento: MomentoProgramacao) => {
      const remoteState = getLiveRemoteStateSnapshot();
      const currentMomentos = getActiveMomentos(remoteState);
      run('set-momentos', 'set_momentos', {
        momentos: currentMomentos
          .map((existing) => existing.id === momento.id ? momento : existing)
          .sort((a, b) => a.ordem - b.ordem),
      });
    },
    removeMomento: (id: string) => {
      const remoteState = getLiveRemoteStateSnapshot();
      const currentMomentos = getActiveMomentos(remoteState);
      run('set-momentos', 'set_momentos', {
        momentos: currentMomentos.filter((momento) => momento.id !== id),
      });
    },
    adjustCurrentMomentDuration: (deltaSeconds: number) => run('adjust-duration', 'adjust_duration', { deltaSeconds }),
    pendingAction: uiState.pendingAction,
    isSubmitting: uiState.isSubmitting,
    lastError: uiState.lastError,
    connectionStatus: uiState.connectionStatus,
  }), [run, uiState.connectionStatus, uiState.isSubmitting, uiState.lastError, uiState.pendingAction]);

  return <CultoContext.Provider value={value}>{children}</CultoContext.Provider>;
};

export const useCulto = () => {
  const ctx = React.useContext(CultoContext);
  if (!ctx) throw new Error('useCulto must be used within CultoProvider');
  const remoteState = useStableLiveRemoteStateForView();
  const culto = React.useMemo(() => getActiveCulto(remoteState), [remoteState]);
  const momentos = React.useMemo(() => getActiveMomentos(remoteState), [remoteState]);

  return React.useMemo(() => ({
    ...ctx,
    cultos: remoteState.cultos,
    activeCultoId: remoteState.activeCultoId,
    culto,
    momentos,
    allMomentos: remoteState.allMomentos,
    currentIndex: remoteState.currentIndex,
    executionMode: remoteState.executionMode,
    moderadorReleaseActive: remoteState.moderadorReleaseActive,
    moderadorReleaseUpdatedAt: remoteState.moderadorReleaseUpdatedAt,
    moderadorReleaseBy: remoteState.moderadorReleaseBy,
    moderadorReleasePendingMomentId: remoteState.moderadorReleasePendingMomentId,
    moderadorReleaseGrantedMomentId: remoteState.moderadorReleaseGrantedMomentId,
    getMomentStatus: (index: number) => getMomentStatus(remoteState, index),
  }), [ctx, culto, momentos, remoteState]);
};

export const useCultoTimer = () => {
  const liveRemoteState = useLiveRemoteState();
  const liveTimer = useGlobalTimerSnapshot();

  return React.useMemo(() => ({
    isPaused: liveRemoteState.timerStatus === 'paused',
    elapsedSeconds: liveTimer.elapsedSeconds,
    momentElapsedSeconds: liveTimer.momentElapsedSeconds,
    elapsedMs: liveTimer.elapsedMs,
    momentElapsedMs: liveTimer.momentElapsedMs,
  }), [liveRemoteState.timerStatus, liveTimer]);
};

export const useLiveCultoView = () => {
  const remoteState = useStableLiveRemoteStateForView();

  const culto = React.useMemo(() => getActiveCulto(remoteState), [remoteState]);
  const momentos = React.useMemo(() => getActiveMomentos(remoteState), [remoteState]);

  return React.useMemo(() => ({
    remoteState,
    culto,
    momentos,
    currentIndex: remoteState.currentIndex,
    executionMode: remoteState.executionMode,
    isPaused: remoteState.timerStatus === 'paused',
    moderadorReleaseActive: remoteState.moderadorReleaseActive,
    moderadorReleaseUpdatedAt: remoteState.moderadorReleaseUpdatedAt,
    moderadorReleaseBy: remoteState.moderadorReleaseBy,
    moderadorReleasePendingMomentId: remoteState.moderadorReleasePendingMomentId,
    moderadorReleaseGrantedMomentId: remoteState.moderadorReleaseGrantedMomentId,
    getMomentStatus: (index: number) => getMomentStatus(remoteState, index),
  }), [culto, momentos, remoteState]);
};

export const useCultoControls = () => {
  const { uiState, runCommand } = useSyncCommands();

  const run = React.useCallback((actionKey: string, command: string, payload?: Record<string, unknown>) => {
    void runCommand(actionKey, command, payload);
  }, [runCommand]);

  return React.useMemo(() => ({
    pendingAction: uiState.pendingAction,
    isSubmitting: uiState.isSubmitting,
    lastError: uiState.lastError,
    connectionStatus: uiState.connectionStatus,
    iniciarCulto: () => run('start', 'start'),
    pausar: () => run('pause', 'pause'),
    retomar: () => run('resume', 'resume'),
    avancar: () => run('advance', 'advance'),
    voltar: () => run('back', 'back'),
    pular: () => run('skip', 'skip'),
    finalizarCulto: () => run('finish', 'finish'),
    marcarChamado: (id: string) => run('mark-called', 'mark_called', { id }),
    adjustCurrentMomentDuration: (deltaSeconds: number) => run('adjust-duration', 'adjust_duration', { deltaSeconds }),
    setExecutionMode: (mode: ExecutionMode) => run('set-execution-mode', 'set_execution_mode', { mode }),
    toggleModeradorRelease: (active: boolean) => run('toggle-moderador-release', 'toggle_moderador_release', { active }),
    updateModeradorStatus: (id: string, status: ModeradorCallStatus) => run('update-moderador-status', 'update_moderador_status', { id, status }),
  }), [run, uiState.connectionStatus, uiState.isSubmitting, uiState.lastError, uiState.pendingAction]);
};
