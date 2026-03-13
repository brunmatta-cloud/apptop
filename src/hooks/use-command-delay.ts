import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ScheduledCommand = {
  label: string;
  executeAt: number;
};

const COUNTDOWN_TICK_MS = 100;

export const useCommandDelay = (initialDelaySeconds = 0) => {
  const [scheduledCommand, setScheduledCommand] = useState<ScheduledCommand | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const delaySeconds = Math.max(0, initialDelaySeconds);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancelScheduledCommand = useCallback(() => {
    clearTimers();
    setScheduledCommand(null);
    setRemainingMs(0);
  }, [clearTimers]);

  const scheduleCommand = useCallback((label: string, command: () => void) => {
    if (delaySeconds <= 0) {
      cancelScheduledCommand();
      command();
      return;
    }

    cancelScheduledCommand();

    const executeAt = Date.now() + delaySeconds * 1000;
    setScheduledCommand({ label, executeAt });
    setRemainingMs(delaySeconds * 1000);

    intervalRef.current = window.setInterval(() => {
      setRemainingMs(Math.max(0, executeAt - Date.now()));
    }, COUNTDOWN_TICK_MS);

    timeoutRef.current = window.setTimeout(() => {
      clearTimers();
      setScheduledCommand(null);
      setRemainingMs(0);
      command();
    }, delaySeconds * 1000);
  }, [cancelScheduledCommand, clearTimers, delaySeconds]);

  useEffect(() => () => {
    clearTimers();
  }, [clearTimers]);

  const remainingSeconds = useMemo(() => Math.max(0, Math.ceil(remainingMs / 1000)), [remainingMs]);

  return {
    delaySeconds,
    hasDelay: delaySeconds > 0,
    scheduledCommandLabel: scheduledCommand?.label ?? null,
    remainingMs,
    remainingSeconds,
    scheduleCommand,
    cancelScheduledCommand,
  };
};
