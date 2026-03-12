import React from 'react';
import type { Culto, ExecutionMode, ModeradorCallStatus, MomentStatus, MomentoProgramacao } from '@/types/culto';
import type { ConnectionStatus } from '@/features/culto-sync/domain';
import { getActiveCulto, getActiveMomentos, getMomentStatus } from '@/features/culto-sync/domain';
import { useCeremonySession, useLiveRemoteState } from '@/contexts/SyncStoreContext';
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

export const CultoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const model = useCeremonySession();

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
    moderadorReleasePendingMomentId: model.remoteState.moderadorReleasePendingMomentId,
    moderadorReleaseGrantedMomentId: model.remoteState.moderadorReleaseGrantedMomentId,
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
  }), [model]);

  return <CultoContext.Provider value={value}>{children}</CultoContext.Provider>;
};

export const useCulto = () => {
  const ctx = React.useContext(CultoContext);
  if (!ctx) throw new Error('useCulto must be used within CultoProvider');
  return ctx;
};

export const useCultoTimer = () => {
  const liveRemoteState = useLiveRemoteState();
  const liveTimer = useLiveTimerSnapshot();

  return React.useMemo(() => ({
    isPaused: liveRemoteState.timerStatus === 'paused',
    elapsedSeconds: liveTimer.elapsedSeconds,
    momentElapsedSeconds: liveTimer.momentElapsedSeconds,
    elapsedMs: liveTimer.elapsedMs,
    momentElapsedMs: liveTimer.momentElapsedMs,
  }), [liveRemoteState.timerStatus, liveTimer]);
};

export const useLiveCultoView = () => {
  const remoteState = useLiveRemoteState();

  const culto = React.useMemo(() => getActiveCulto(remoteState), [remoteState]);
  const momentos = React.useMemo(() => getActiveMomentos(remoteState), [remoteState]);

  return React.useMemo(() => ({
    remoteState,
    culto,
    momentos,
    currentIndex: remoteState.currentIndex,
    executionMode: remoteState.executionMode,
    isPaused: remoteState.timerStatus === 'paused',
    getMomentStatus: (index: number) => getMomentStatus(remoteState, index),
  }), [culto, momentos, remoteState]);
};
