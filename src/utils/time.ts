export const LIVE_TICK_MS = 250;

const quantizeMs = (valueMs: number, mode: 'floor' | 'ceil') => {
  if (!Number.isFinite(valueMs)) {
    return 0;
  }

  const safeValue = Math.max(0, valueMs);
  const steps = safeValue / LIVE_TICK_MS;
  const roundedSteps = mode === 'ceil' ? Math.ceil(steps) : Math.floor(steps);
  return roundedSteps * LIVE_TICK_MS;
};

export const quantizeElapsedMs = (valueMs: number) => quantizeMs(valueMs, 'floor');

export const quantizeRemainingMs = (valueMs: number) => quantizeMs(valueMs, 'ceil');

export const formatTimerMs = (valueMs: number) => {
  const normalizedMs = quantizeRemainingMs(valueMs);
  const totalSeconds = Math.floor(normalizedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatSecondsLabel = (valueMs: number) => `${Math.ceil(quantizeRemainingMs(valueMs) / 1000)}s`;

export const formatElapsedLabel = (valueMs: number) => {
  const normalizedMs = quantizeElapsedMs(valueMs);
  const hours = Math.floor(normalizedMs / 3600000);
  const minutes = Math.floor((normalizedMs % 3600000) / 60000);
  const seconds = Math.floor((normalizedMs % 60000) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}min ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }

  return `${seconds}s`;
};
