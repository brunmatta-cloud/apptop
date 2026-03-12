import { useEffect, useState } from 'react';
import { LIVE_TICK_MS } from '@/utils/time';

export const useAlignedNow = (enabled: boolean) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Atualiza imediatamente ao habilitar
    setNowMs(Date.now());

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, LIVE_TICK_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled]);

  return nowMs;
};
