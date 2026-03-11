import { useState, useEffect, useCallback } from 'react';
import { LIVE_TICK_MS } from '@/utils/time';

/**
 * Shared clock hook - updates every 250ms but uses a stable ref
 * to avoid unnecessary re-renders across multiple components
 */
export function useClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    // Align to the next 250ms boundary for consistent updates
    const now = Date.now();
    const remainder = now % LIVE_TICK_MS;
    const msUntilNextTick = remainder === 0 ? LIVE_TICK_MS : LIVE_TICK_MS - remainder;
    
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      setCurrentTime(new Date());
      interval = setInterval(() => setCurrentTime(new Date()), LIVE_TICK_MS);
    }, msUntilNextTick);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const formatTime = useCallback((d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`, []);

  return { currentTime, formatTime };
}
