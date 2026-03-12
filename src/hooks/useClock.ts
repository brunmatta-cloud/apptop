import { useState, useEffect, useCallback } from 'react';
import { getLiveServerNowMs, useLiveRemoteState } from '@/contexts/SyncStoreContext';

const CLOCK_TICK_MS = 1000;

export function useClock() {
  const remoteState = useLiveRemoteState();
  const [currentTime, setCurrentTime] = useState(() => new Date(getLiveServerNowMs()));

  useEffect(() => {
    setCurrentTime(new Date(getLiveServerNowMs()));

    const interval = window.setInterval(() => {
      setCurrentTime(new Date(getLiveServerNowMs()));
    }, CLOCK_TICK_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [remoteState.updatedAt]);

  const formatTime = useCallback(
    (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`,
    []
  );

  return { currentTime, formatTime };
}
