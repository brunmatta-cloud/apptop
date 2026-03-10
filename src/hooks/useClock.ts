import { useState, useEffect, useCallback } from 'react';

/**
 * Shared clock hook - updates every second but uses a stable ref
 * to avoid unnecessary re-renders across multiple components
 */
export function useClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    // Align to the next second boundary for consistent updates
    const now = Date.now();
    const msUntilNextSecond = 1000 - (now % 1000);
    
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      setCurrentTime(new Date());
      interval = setInterval(() => setCurrentTime(new Date()), 1000);
    }, msUntilNextSecond);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const formatTime = useCallback((d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`, []);

  return { currentTime, formatTime };
}
