import React from 'react';
import type { ConnectionStatus } from '@/features/culto-sync/domain';
import { useLiveRemoteState, useSyncCommands } from '@/contexts/SyncStoreContext';

interface CronometroContextType {
  timeAdjustment: number;
  addTime: (seconds: number) => void;
  resetAdjustment: () => void;
  isBlinking: boolean;
  toggleBlink: () => void;
  setBlinking: (value: boolean) => void;
  message: string;
  setMessage: (msg: string) => void;
  showMessage: boolean;
  setShowMessage: (value: boolean) => void;
  orangeThreshold: number;
  redThreshold: number;
  setOrangeThreshold: (seconds: number) => void;
  setRedThreshold: (seconds: number) => void;
  topFontSize: number;
  bottomFontSize: number;
  timerFontSize: number;
  messageFontSize: number;
  backgroundColor: string;
  timerTextColor: string;
  topTextColor: string;
  bottomTextColor: string;
  messageTextColor: string;
  warningColor: string;
  dangerColor: string;
  setTopFontSize: (size: number) => void;
  setBottomFontSize: (size: number) => void;
  setTimerFontSize: (size: number) => void;
  setMessageFontSize: (size: number) => void;
  setBackgroundColor: (color: string) => void;
  setTimerTextColor: (color: string) => void;
  setTopTextColor: (color: string) => void;
  setBottomTextColor: (color: string) => void;
  setMessageTextColor: (color: string) => void;
  setWarningColor: (color: string) => void;
  setDangerColor: (color: string) => void;
  pendingAction: string | null;
  isSubmitting: boolean;
  lastError: string | null;
  connectionStatus: ConnectionStatus;
}

const CronometroContext = React.createContext<CronometroContextType | null>(null);

export const CronometroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const remoteState = useLiveRemoteState();
  const { uiState, runCommand } = useSyncCommands();
  const [timeAdjustment, setTimeAdjustment] = React.useState(0);
  const settings = remoteState.settings;
  const patch = React.useCallback((next: Partial<typeof settings>) => {
    void runCommand('patch-settings', 'patch_settings', { patch: next });
  }, [runCommand]);

  const value = React.useMemo<CronometroContextType>(() => ({
    timeAdjustment,
    addTime: (seconds: number) => setTimeAdjustment((current) => current + seconds),
    resetAdjustment: () => setTimeAdjustment(0),
    isBlinking: settings.isBlinking,
    toggleBlink: () => patch({ isBlinking: !settings.isBlinking }),
    setBlinking: (value: boolean) => patch({ isBlinking: value }),
    message: settings.message,
    setMessage: (msg: string) => patch({ message: msg }),
    showMessage: settings.showMessage,
    setShowMessage: (value: boolean) => patch({ showMessage: value }),
    orangeThreshold: settings.orangeThreshold,
    redThreshold: settings.redThreshold,
    setOrangeThreshold: (seconds: number) => patch({ orangeThreshold: seconds }),
    setRedThreshold: (seconds: number) => patch({ redThreshold: seconds }),
    topFontSize: settings.topFontSize,
    bottomFontSize: settings.bottomFontSize,
    timerFontSize: settings.timerFontSize,
    messageFontSize: settings.messageFontSize,
    backgroundColor: settings.backgroundColor,
    timerTextColor: settings.timerTextColor,
    topTextColor: settings.topTextColor,
    bottomTextColor: settings.bottomTextColor,
    messageTextColor: settings.messageTextColor,
    warningColor: settings.warningColor,
    dangerColor: settings.dangerColor,
    setTopFontSize: (size: number) => patch({ topFontSize: size }),
    setBottomFontSize: (size: number) => patch({ bottomFontSize: size }),
    setTimerFontSize: (size: number) => patch({ timerFontSize: size }),
    setMessageFontSize: (size: number) => patch({ messageFontSize: size }),
    setBackgroundColor: (color: string) => patch({ backgroundColor: color }),
    setTimerTextColor: (color: string) => patch({ timerTextColor: color }),
    setTopTextColor: (color: string) => patch({ topTextColor: color }),
    setBottomTextColor: (color: string) => patch({ bottomTextColor: color }),
    setMessageTextColor: (color: string) => patch({ messageTextColor: color }),
    setWarningColor: (color: string) => patch({ warningColor: color }),
    setDangerColor: (color: string) => patch({ dangerColor: color }),
    pendingAction: uiState.pendingAction,
    isSubmitting: uiState.isSubmitting,
    lastError: uiState.lastError,
    connectionStatus: uiState.connectionStatus,
  }), [patch, settings, timeAdjustment, uiState.connectionStatus, uiState.isSubmitting, uiState.lastError, uiState.pendingAction]);

  return <CronometroContext.Provider value={value}>{children}</CronometroContext.Provider>;
};

export const useCronometro = () => {
  const ctx = React.useContext(CronometroContext);
  if (!ctx) throw new Error('useCronometro must be used within CronometroProvider');
  return ctx;
};
