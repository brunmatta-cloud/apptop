import { useState, useEffect, useCallback } from 'react';

const CLOCK_TICK_MS = 1000;

export function useClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    setCurrentTime(new Date());

    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, CLOCK_TICK_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const formatTime = useCallback(
    (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`,
    []
  );

  return { currentTime, formatTime };
}
