import React, { createContext, useContext, useState, useCallback, useEffect, useRef, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CronometroContextType {
  timeAdjustment: number;
  addTime: (seconds: number) => void;
  resetAdjustment: () => void;
  isBlinking: boolean;
  toggleBlink: () => void;
  setBlinking: (v: boolean) => void;
  message: string;
  setMessage: (msg: string) => void;
  showMessage: boolean;
  setShowMessage: (v: boolean) => void;
  orangeThreshold: number;
  redThreshold: number;
  setOrangeThreshold: (s: number) => void;
  setRedThreshold: (s: number) => void;
  topFontSize: number;
  bottomFontSize: number;
  timerFontSize: number;
  setTopFontSize: (s: number) => void;
  setBottomFontSize: (s: number) => void;
  setTimerFontSize: (s: number) => void;
}

const CronometroContext = createContext<CronometroContextType | null>(null);

export const CronometroProvider: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [timeAdjustment, setTimeAdjustment] = useState(0);
  const [isBlinking, setBlinking] = useState(false);
  const [message, setMessageLocal] = useState('');
  const [showMessage, setShowMessageLocal] = useState(false);
  const [orangeThreshold, setOrangeThreshold] = useState(120);
  const [redThreshold, setRedThreshold] = useState(20);
  const [topFontSize, setTopFontSize] = useState(2.5);
  const [bottomFontSize, setBottomFontSize] = useState(2.5);
  const [timerFontSize, setTimerFontSize] = useState(25);
  const isSyncingRef = useRef(false);
  const lastLocalUpdateRef = useRef(0);
  const messageRef = useRef('');
  const showMessageRef = useRef(false);

  messageRef.current = message;
  showMessageRef.current = showMessage;

  // Load message state from database on mount
  useEffect(() => {
    supabase
      .from('culto_sync_state')
      .select('message, show_message')
      .eq('id', 'main')
      .single()
      .then(({ data }) => {
        if (data) {
          setMessageLocal(data.message || '');
          setShowMessageLocal(data.show_message || false);
        }
      });
  }, []);

  // Subscribe to realtime updates for message
  useEffect(() => {
    const channel = supabase
      .channel('cronometro-msg-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'culto_sync_state', filter: 'id=eq.main' },
        (payload) => {
          if (Date.now() - lastLocalUpdateRef.current < 500) return;
          isSyncingRef.current = true;
          const data = payload.new;
          setMessageLocal(data.message || '');
          setShowMessageLocal(data.show_message || false);
          setTimeout(() => { isSyncingRef.current = false; }, 600);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const syncMessage = useCallback(async (msg: string, show: boolean) => {
    if (isSyncingRef.current) return;
    lastLocalUpdateRef.current = Date.now();
    try {
      await supabase
        .from('culto_sync_state')
        .update({ message: msg, show_message: show })
        .eq('id', 'main');
    } catch (e) {
      console.error('Failed to sync message:', e);
    }
  }, []);

  const setMessage = useCallback((msg: string) => {
    setMessageLocal(msg);
    messageRef.current = msg;
  }, []);

  const setShowMessage = useCallback((v: boolean) => {
    setShowMessageLocal(v);
    showMessageRef.current = v;
    syncMessage(messageRef.current, v);
  }, [syncMessage]);

  const addTime = useCallback((seconds: number) => {
    setTimeAdjustment(prev => prev + seconds);
  }, []);

  const resetAdjustment = useCallback(() => setTimeAdjustment(0), []);
  const toggleBlink = useCallback(() => setBlinking(prev => !prev), []);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = React.useMemo<CronometroContextType>(() => ({
    timeAdjustment, addTime, resetAdjustment,
    isBlinking, toggleBlink, setBlinking,
    message, setMessage, showMessage, setShowMessage,
    orangeThreshold, redThreshold, setOrangeThreshold, setRedThreshold,
    topFontSize, bottomFontSize, timerFontSize, setTopFontSize, setBottomFontSize, setTimerFontSize,
  }), [
    timeAdjustment, addTime, resetAdjustment,
    isBlinking, toggleBlink,
    message, setMessage, showMessage, setShowMessage,
    orangeThreshold, redThreshold,
    topFontSize, bottomFontSize, timerFontSize,
  ]);

  return (
    <CronometroContext.Provider value={value}>
      {children}
    </CronometroContext.Provider>
  );
});

CronometroProvider.displayName = 'CronometroProvider';

export const useCronometro = () => {
  const ctx = useContext(CronometroContext);
  if (!ctx) throw new Error('useCronometro must be used within CronometroProvider');
  return ctx;
};
