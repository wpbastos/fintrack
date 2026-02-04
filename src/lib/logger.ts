/**
 * Development-only logger with configurable log levels
 *
 * Set LOG_LEVEL env variable to control verbosity:
 * - "debug" - all logs (default in dev)
 * - "info"  - info, warn, error
 * - "warn"  - warn, error
 * - "error" - errors only
 * - "none"  - disable all logs (except forced)
 *
 * Set LOG_FILE env variable to also write logs to a file:
 * - e.g., LOG_FILE=dev.log
 */

import * as fs from "fs";
import * as path from "path";

const isDev = process.env.NODE_ENV === "development";
const logFilePath = process.env.LOG_FILE
  ? path.isAbsolute(process.env.LOG_FILE)
    ? process.env.LOG_FILE
    : path.resolve(process.cwd(), process.env.LOG_FILE)
  : null;

// Helper to format args for file output
function formatArgs(args: unknown[]): string {
  return args
    .map((arg) =>
      typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)
    )
    .join(" ");
}

// Initialize log file and intercept console output
if (logFilePath) {
  try {
    // Clear log file on app start (writeFileSync overwrites)
    const header = `${"=".repeat(60)}\nLog started: ${new Date().toISOString()}\nLog file: ${logFilePath}\n${"=".repeat(60)}\n`;
    fs.writeFileSync(logFilePath, header);

    // Store original console methods
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Override console methods to also write to file
    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      fs.appendFileSync(logFilePath, formatArgs(args) + "\n");
    };

    console.info = (...args: unknown[]) => {
      originalInfo.apply(console, args);
      fs.appendFileSync(logFilePath, formatArgs(args) + "\n");
    };

    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, args);
      fs.appendFileSync(logFilePath, `[WARN] ${formatArgs(args)}\n`);
    };

    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      fs.appendFileSync(logFilePath, `[ERROR] ${formatArgs(args)}\n`);
    };

    console.log(`[Logger] Writing to: ${logFilePath}`);
  } catch (err) {
    console.error(`[Logger] Failed to initialize log file: ${err}`);
  }
}

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
      const formatted = formatMessage(context, step, message);
      console.log(formatted);
      if (options?.data !== undefined) {
        console.log(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    info(step: string, message: string, options?: LogOptions) {
      if (!shouldLog("info", options?.force)) return;
      const formatted = formatMessage(context, step, message);
      console.info(formatted);
      if (options?.data !== undefined) {
        console.info(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    warn(step: string, message: string, options?: LogOptions) {
      if (!shouldLog("warn", options?.force)) return;
      const formatted = formatMessage(context, step, message);
      console.warn(formatted);
      if (options?.data !== undefined) {
        console.warn(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    error(step: string, message: string, options?: LogOptions) {
      if (!shouldLog("error", options?.force)) return;
      const formatted = formatMessage(context, step, message);
      console.error(formatted);
      if (options?.data !== undefined) {
        console.error(`[${context}] Data:`, JSON.stringify(options.data, null, 2));
      }
    },

    /** Log with timing - returns a function to call when done */
    time(step: string, message: string) {
      if (!shouldLog("debug")) return () => {};
      const start = Date.now();
      const startFormatted = formatMessage(context, step, `${message} (started)`);
      console.log(startFormatted);
      return (endMessage?: string) => {
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        const endFormatted = formatMessage(context, step, `${endMessage || message} (${duration}s)`);
        console.log(endFormatted);
      };
    },
  };
}

// Pre-configured loggers for common contexts
export const aiLogger = createLogger("AI Resolve");
export const importLogger = createLogger("Import");
export const resolverLogger = createLogger("Resolver");
export const pdfExtractLogger = createLogger("PDF Extract");
