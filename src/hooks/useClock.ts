import { useState, useEffect, useCallback } from 'react';

const CLOCK_TICK_MS = 1000;

/**
 * Shared clock hook aligned to whole seconds.
 * The UI only shows HH:MM:SS, so updating faster than 1s just
 * creates unnecessary re-renders on heavy desktop pages.
 */
export function useClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    // Align to the next second boundary for stable clock updates.
    const now = Date.now();
    const remainder = now % CLOCK_TICK_MS;
    const msUntilNextTick = remainder === 0 ? CLOCK_TICK_MS : CLOCK_TICK_MS - remainder;
    
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      setCurrentTime(new Date());
      interval = setInterval(() => setCurrentTime(new Date()), CLOCK_TICK_MS);
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
