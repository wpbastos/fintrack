/**
 * Development-only logger with configurable log levels
 *
 * Set LOG_LEVEL env variable to control verbosity:
 * - "debug" - all logs (default in dev)
 * - "info"  - info, warn, error
 * - "warn"  - warn, error
 * - "error" - errors only
 * - "none"  - disable all logs (except forced)
 */

const isDev = process.env.NODE_ENV === "development";

type LogLevel = "debug" | "info" | "warn" | "error" | "none";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

function getConfiguredLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  return isDev ? "debug" : "error";
}

const configuredLevel = getConfiguredLevel();

interface LogOptions {
  /** Optional data to log (will be JSON stringified) */
  data?: unknown;
  /** Force log even in production (use sparingly) */
  force?: boolean;
}

function formatMessage(context: string, step: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${context}] ${timestamp} | ${step} | ${message}`;
}

function shouldLog(level: LogLevel, force?: boolean): boolean {
  if (force) return true;
  if (level === "none") return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

export function createLogger(context: string) {
  return {
    debug(step: string, message: string, options?: LogOptions) {
      if (!shouldLog("debug", options?.force)) return;
      console.log(formatMessage(context, step, message));
      if (options?.data !== undefined) {
        console.log(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    info(step: string, message: string, options?: LogOptions) {
      if (!shouldLog("info", options?.force)) return;
      console.info(formatMessage(context, step, message));
      if (options?.data !== undefined) {
        console.info(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    warn(step: string, message: string, options?: LogOptions) {
      if (!shouldLog("warn", options?.force)) return;
      console.warn(formatMessage(context, step, message));
      if (options?.data !== undefined) {
        console.warn(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    error(step: string, message: string, options?: LogOptions) {
      if (!shouldLog("error", options?.force)) return;
      console.error(formatMessage(context, step, message));
      if (options?.data !== undefined) {
        console.error(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    /** Log with timing - returns a function to call when done */
    time(step: string, message: string) {
      if (!shouldLog("debug")) return () => {};
      const start = Date.now();
      console.log(formatMessage(context, step, `${message} (started)`));
      return (endMessage?: string) => {
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        console.log(formatMessage(context, step, `${endMessage || message} (${duration}s)`));
      };
    },
  };
}

// Pre-configured loggers for common contexts
export const aiLogger = createLogger("AI Resolve");
export const importLogger = createLogger("Import");
export const resolverLogger = createLogger("Resolver");
