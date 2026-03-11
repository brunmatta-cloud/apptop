import React from 'react';
import type { Culto, ExecutionMode, ModeradorCallStatus, MomentStatus, MomentoProgramacao } from '@/types/culto';
import type { ConnectionStatus } from '@/features/culto-sync/domain';
import { useCeremonySession } from '@/contexts/SyncStoreContext';
import { useLiveTimerSnapshot } from '@/hooks/useLiveTimerSnapshot';

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
  isPaused: boolean;
  elapsedSeconds: number;
  momentElapsedSeconds: number;
  elapsedMs: number;
  momentElapsedMs: number;
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

export const CultoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const model = useCeremonySession();
  const liveTimer = useLiveTimerSnapshot();

  const value = React.useMemo<CultoContextType>(() => ({
    cultos: model.cultos,
    addCulto: model.addCulto,
    updateCulto: model.updateCulto,
    removeCulto: model.removeCulto,
    duplicateCulto: model.duplicateCulto,
    activeCultoId: model.remoteState.activeCultoId,
    setActiveCultoId: model.setActiveCultoId,
    culto: model.culto,
    setCulto: model.setCulto,
    momentos: model.momentos,
    allMomentos: model.allMomentos,
    setMomentos: model.setMomentos,
    currentIndex: model.currentIndex,
    executionMode: model.executionMode,
    setExecutionMode: model.setExecutionMode,
    isPaused: model.isPaused,
    elapsedSeconds: liveTimer.elapsedSeconds,
    momentElapsedSeconds: liveTimer.momentElapsedSeconds,
    elapsedMs: liveTimer.elapsedMs,
    momentElapsedMs: liveTimer.momentElapsedMs,
    avancar: model.avancar,
    voltar: model.voltar,
    pausar: model.pausar,
    retomar: model.retomar,
    pular: model.pular,
    iniciarCulto: model.iniciarCulto,
    finalizarCulto: model.finalizarCulto,
    moderadorReleaseActive: model.remoteState.moderadorReleaseActive,
    moderadorReleaseUpdatedAt: model.remoteState.moderadorReleaseUpdatedAt,
    moderadorReleaseBy: model.remoteState.moderadorReleaseBy,
    toggleModeradorRelease: model.toggleModeradorRelease,
    updateModeradorStatus: model.updateModeradorStatus,
    getMomentStatus: model.getMomentStatus,
    marcarChamado: model.marcarChamado,
    addMomento: model.addMomento,
    updateMomento: model.updateMomento,
    removeMomento: model.removeMomento,
    adjustCurrentMomentDuration: model.adjustCurrentMomentDuration,
    pendingAction: model.uiState.pendingAction,
    isSubmitting: model.uiState.isSubmitting,
    lastError: model.uiState.lastError,
    connectionStatus: model.uiState.connectionStatus,
  }), [liveTimer, model]);

  return <CultoContext.Provider value={value}>{children}</CultoContext.Provider>;
};

export const useCulto = () => {
  const ctx = React.useContext(CultoContext);
  if (!ctx) throw new Error('useCulto must be used within CultoProvider');
  return ctx;
};
