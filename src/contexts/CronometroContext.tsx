import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

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
}

type SyncRow = Tables<'culto_sync_state'>;

type CronometroSettings = {
  isBlinking: boolean;
  orangeThreshold: number;
  redThreshold: number;
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
  message: string;
  showMessage: boolean;
};

const STORAGE_KEY = 'culto-ao-vivo:cronometro-settings';
const SYNC_ROW_ID = 'main';

const defaultSettings: CronometroSettings = {
  isBlinking: false,
  orangeThreshold: 120,
  redThreshold: 20,
  topFontSize: 4,
  bottomFontSize: 2.75,
  timerFontSize: 28,
  messageFontSize: 16,
  backgroundColor: '#000000',
  timerTextColor: '#ffffff',
  topTextColor: '#b8c0d4',
  bottomTextColor: '#99a2b3',
  messageTextColor: '#ffffff',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',
  message: '',
  showMessage: false,
};

const CronometroContext = createContext<CronometroContextType | null>(null);

const isValidHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

const normalizeSettings = (value?: Partial<SyncRow> | Partial<CronometroSettings> | null): CronometroSettings => {
  const settings = value as Partial<CronometroSettings> | undefined;

  return {
    isBlinking: typeof value?.is_blinking === 'boolean' ? value.is_blinking : Boolean(settings?.isBlinking),
    orangeThreshold: Number.isFinite(value?.orange_threshold) ? Math.max(10, Math.min(600, Number(value.orange_threshold))) : Number.isFinite(settings?.orangeThreshold) ? Math.max(10, Math.min(600, Number(settings.orangeThreshold))) : defaultSettings.orangeThreshold,
    redThreshold: Number.isFinite(value?.red_threshold) ? Math.max(5, Math.min(300, Number(value.red_threshold))) : Number.isFinite(settings?.redThreshold) ? Math.max(5, Math.min(300, Number(settings.redThreshold))) : defaultSettings.redThreshold,
    topFontSize: Number.isFinite(value?.top_font_size) ? Math.max(1.25, Math.min(8, Number(value.top_font_size))) : Number.isFinite(settings?.topFontSize) ? Math.max(1.25, Math.min(8, Number(settings.topFontSize))) : defaultSettings.topFontSize,
    bottomFontSize: Number.isFinite(value?.bottom_font_size) ? Math.max(1, Math.min(6, Number(value.bottom_font_size))) : Number.isFinite(settings?.bottomFontSize) ? Math.max(1, Math.min(6, Number(settings.bottomFontSize))) : defaultSettings.bottomFontSize,
    timerFontSize: Number.isFinite(value?.timer_font_size) ? Math.max(6, Math.min(40, Number(value.timer_font_size))) : Number.isFinite(settings?.timerFontSize) ? Math.max(6, Math.min(40, Number(settings.timerFontSize))) : defaultSettings.timerFontSize,
    messageFontSize: Number.isFinite(value?.message_font_size) ? Math.max(2, Math.min(24, Number(value.message_font_size))) : Number.isFinite(settings?.messageFontSize) ? Math.max(2, Math.min(24, Number(settings.messageFontSize))) : defaultSettings.messageFontSize,
    backgroundColor: isValidHexColor(String(value?.background_color ?? '')) ? String(value?.background_color) : isValidHexColor(String(settings?.backgroundColor ?? '')) ? String(settings?.backgroundColor) : defaultSettings.backgroundColor,
    timerTextColor: isValidHexColor(String(value?.timer_text_color ?? '')) ? String(value?.timer_text_color) : isValidHexColor(String(settings?.timerTextColor ?? '')) ? String(settings?.timerTextColor) : defaultSettings.timerTextColor,
    topTextColor: isValidHexColor(String(value?.top_text_color ?? '')) ? String(value?.top_text_color) : isValidHexColor(String(settings?.topTextColor ?? '')) ? String(settings?.topTextColor) : defaultSettings.topTextColor,
    bottomTextColor: isValidHexColor(String(value?.bottom_text_color ?? '')) ? String(value?.bottom_text_color) : isValidHexColor(String(settings?.bottomTextColor ?? '')) ? String(settings?.bottomTextColor) : defaultSettings.bottomTextColor,
    messageTextColor: isValidHexColor(String(value?.message_text_color ?? '')) ? String(value?.message_text_color) : isValidHexColor(String(settings?.messageTextColor ?? '')) ? String(settings?.messageTextColor) : defaultSettings.messageTextColor,
    warningColor: isValidHexColor(String(value?.warning_color ?? '')) ? String(value?.warning_color) : isValidHexColor(String(settings?.warningColor ?? '')) ? String(settings?.warningColor) : defaultSettings.warningColor,
    dangerColor: isValidHexColor(String(value?.danger_color ?? '')) ? String(value?.danger_color) : isValidHexColor(String(settings?.dangerColor ?? '')) ? String(settings?.dangerColor) : defaultSettings.dangerColor,
    message: typeof value?.message === 'string' ? value.message : typeof settings?.message === 'string' ? settings.message : defaultSettings.message,
    showMessage: typeof value?.show_message === 'boolean' ? value.show_message : Boolean(settings?.showMessage),
  };
};

const readStoredState = (): CronometroSettings => {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return normalizeSettings(JSON.parse(raw) as Partial<CronometroSettings>);
  } catch (error) {
    console.error('Falha ao ler configuracoes locais do cronometro:', error);
    return defaultSettings;
  }
};

const buildPayload = (settings: CronometroSettings) => ({
  id: SYNC_ROW_ID,
  is_blinking: settings.isBlinking,
  orange_threshold: settings.orangeThreshold,
  red_threshold: settings.redThreshold,
  top_font_size: settings.topFontSize,
  bottom_font_size: settings.bottomFontSize,
  timer_font_size: settings.timerFontSize,
  message_font_size: settings.messageFontSize,
  background_color: settings.backgroundColor,
  timer_text_color: settings.timerTextColor,
  top_text_color: settings.topTextColor,
  bottom_text_color: settings.bottomTextColor,
  message_text_color: settings.messageTextColor,
  warning_color: settings.warningColor,
  danger_color: settings.dangerColor,
  message: settings.message,
  show_message: settings.showMessage,
  updated_at: new Date().toISOString(),
});

export const CronometroProvider: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [timeAdjustment, setTimeAdjustment] = useState(0);
  const [state, setState] = useState<CronometroSettings>(readStoredState);
  const stateRef = useRef(state);
  const remoteEnabledRef = useRef(true);

  const applySettings = useCallback((next: CronometroSettings) => {
    stateRef.current = next;
    setState(next);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Falha ao persistir configuracoes do cronometro:', error);
      }
    }
  }, []);

  const publishSettings = useCallback(async (next: CronometroSettings) => {
    if (!remoteEnabledRef.current) return;

    const { error } = await supabase
      .from('culto_sync_state')
      .upsert(buildPayload(next), { onConflict: 'id' });

    if (error) {
      console.error('Falha ao sincronizar configuracoes do cronometro:', error);
      remoteEnabledRef.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const { data, error } = await supabase
        .from('culto_sync_state')
        .select('*')
        .eq('id', SYNC_ROW_ID)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error('Falha ao carregar configuracoes sincronizadas do cronometro:', error);
        return;
      }

      if (!data) {
        void publishSettings(stateRef.current);
        return;
      }

      applySettings(normalizeSettings(data));
    };

    void bootstrap();

    const channel = supabase
      .channel('cronometro-sync-state')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'culto_sync_state',
        filter: `id=eq.${SYNC_ROW_ID}`,
      }, (payload) => {
        if (!active || !payload.new) return;
        applySettings(normalizeSettings(payload.new as Partial<SyncRow>));
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [applySettings, publishSettings]);

  const updateState = useCallback((patch: Partial<CronometroSettings>) => {
    const next = normalizeSettings({ ...stateRef.current, ...patch });
    applySettings(next);
    void publishSettings(next);
  }, [applySettings, publishSettings]);

  const addTime = useCallback((seconds: number) => setTimeAdjustment((prev) => prev + seconds), []);
  const resetAdjustment = useCallback(() => setTimeAdjustment(0), []);
  const toggleBlink = useCallback(() => updateState({ isBlinking: !stateRef.current.isBlinking }), [updateState]);
  const setBlinking = useCallback((value: boolean) => updateState({ isBlinking: value }), [updateState]);
  const setMessage = useCallback((msg: string) => updateState({ message: msg }), [updateState]);
  const setShowMessage = useCallback((value: boolean) => updateState({ showMessage: value }), [updateState]);
  const setOrangeThreshold = useCallback((seconds: number) => updateState({ orangeThreshold: seconds }), [updateState]);
  const setRedThreshold = useCallback((seconds: number) => updateState({ redThreshold: seconds }), [updateState]);
  const setTopFontSize = useCallback((size: number) => updateState({ topFontSize: size }), [updateState]);
  const setBottomFontSize = useCallback((size: number) => updateState({ bottomFontSize: size }), [updateState]);
  const setTimerFontSize = useCallback((size: number) => updateState({ timerFontSize: size }), [updateState]);
  const setMessageFontSize = useCallback((size: number) => updateState({ messageFontSize: size }), [updateState]);
  const setBackgroundColor = useCallback((color: string) => updateState({ backgroundColor: color }), [updateState]);
  const setTimerTextColor = useCallback((color: string) => updateState({ timerTextColor: color }), [updateState]);
  const setTopTextColor = useCallback((color: string) => updateState({ topTextColor: color }), [updateState]);
  const setBottomTextColor = useCallback((color: string) => updateState({ bottomTextColor: color }), [updateState]);
  const setMessageTextColor = useCallback((color: string) => updateState({ messageTextColor: color }), [updateState]);
  const setWarningColor = useCallback((color: string) => updateState({ warningColor: color }), [updateState]);
  const setDangerColor = useCallback((color: string) => updateState({ dangerColor: color }), [updateState]);

  const value = useMemo<CronometroContextType>(() => ({
    timeAdjustment,
    addTime,
    resetAdjustment,
    isBlinking: state.isBlinking,
    toggleBlink,
    setBlinking,
    message: state.message,
    setMessage,
    showMessage: state.showMessage,
    setShowMessage,
    orangeThreshold: state.orangeThreshold,
    redThreshold: state.redThreshold,
    setOrangeThreshold,
    setRedThreshold,
    topFontSize: state.topFontSize,
    bottomFontSize: state.bottomFontSize,
    timerFontSize: state.timerFontSize,
    messageFontSize: state.messageFontSize,
    backgroundColor: state.backgroundColor,
    timerTextColor: state.timerTextColor,
    topTextColor: state.topTextColor,
    bottomTextColor: state.bottomTextColor,
    messageTextColor: state.messageTextColor,
    warningColor: state.warningColor,
    dangerColor: state.dangerColor,
    setTopFontSize,
    setBottomFontSize,
    setTimerFontSize,
    setMessageFontSize,
    setBackgroundColor,
    setTimerTextColor,
    setTopTextColor,
    setBottomTextColor,
    setMessageTextColor,
    setWarningColor,
    setDangerColor,
  }), [
    timeAdjustment,
    addTime,
    resetAdjustment,
    state,
    toggleBlink,
    setBlinking,
    setMessage,
    setShowMessage,
    setOrangeThreshold,
    setRedThreshold,
    setTopFontSize,
    setBottomFontSize,
    setTimerFontSize,
    setMessageFontSize,
    setBackgroundColor,
    setTimerTextColor,
    setTopTextColor,
    setBottomTextColor,
    setMessageTextColor,
    setWarningColor,
    setDangerColor,
  ]);

  return <CronometroContext.Provider value={value}>{children}</CronometroContext.Provider>;
});

CronometroProvider.displayName = 'CronometroProvider';

export const useCronometro = () => {
  const ctx = useContext(CronometroContext);
  if (!ctx) throw new Error('useCronometro must be used within CronometroProvider');
  return ctx;
};
