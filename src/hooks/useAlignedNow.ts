import { useEffect, useState } from 'react';
import { LIVE_TICK_MS } from '@/utils/time';

export const useAlignedNow = (enabled: boolean) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());

    if (!enabled) {
      return;
    }

    const now = Date.now();
    const remainder = now % LIVE_TICK_MS;
    const msUntilNextTick = remainder === 0 ? LIVE_TICK_MS : LIVE_TICK_MS - remainder;

    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = window.setTimeout(() => {
      setNowMs(Date.now());
      interval = window.setInterval(() => {
        setNowMs(Date.now());
      }, LIVE_TICK_MS);
    }, msUntilNextTick);

    return () => {
      window.clearTimeout(timeout);
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [enabled]);

  return nowMs;
};
