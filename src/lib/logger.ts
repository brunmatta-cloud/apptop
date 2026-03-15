/**
 * Centralized structured logger for 7Flow.
 *
 * Replaces scattered console.error/warn/log with a unified interface
 * that supports log levels, structured context, and future integrations
 * (Sentry, Rollbar, remote logging).
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('Upload failed', { file: name, size, error });
 *   logger.warn('Slow query', { durationMs: 1200 });
 *   logger.info('Session started', { sessionId });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  source?: string;
}

type LogTransport = (entry: LogEntry) => void;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV;

// Minimum log level (show everything in dev, warn+ in production)
const MIN_LEVEL: LogLevel = isDev ? 'debug' : 'warn';

// Console transport (default)
const consoleTransport: LogTransport = (entry) => {
  const prefix = `[7Flow:${entry.source ?? 'app'}]`;
  const args: unknown[] = [prefix, entry.message];
  if (entry.context && Object.keys(entry.context).length > 0) {
    args.push(entry.context);
  }

  switch (entry.level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
};

// Active transports
const transports: LogTransport[] = [consoleTransport];

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>, source?: string) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    source,
  };

  for (const transport of transports) {
    try {
      transport(entry);
    } catch {
      // Transport failure should never break the app
    }
  }
}

/** Create a scoped logger with a fixed source prefix. */
function createScoped(source: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context, source),
    info: (message: string, context?: Record<string, unknown>) => emit('info', message, context, source),
    warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context, source),
    error: (message: string, context?: Record<string, unknown>) => emit('error', message, context, source),
  };
}

/** Register an additional transport (e.g. Sentry, remote API). */
function addTransport(transport: LogTransport) {
  transports.push(transport);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
  scoped: createScoped,
  addTransport,
};
