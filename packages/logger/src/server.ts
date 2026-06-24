import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import pino, { type Logger as PinoLogger } from 'pino';
import { createLogger as createWinstonLogger, format, type Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import type { LogFields, LoggerClient, LoggerConfig } from './types';

import { loadLoggerConfig } from './config';

const loggerConfig = loadLoggerConfig();

type LogMethodName = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

function buildDestination(config: LoggerConfig) {
  if (config.pretty) {
    return pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    });
  }

  return process.stdout;
}

function toLogObject(fields: LogFields | undefined) {
  return fields && Object.keys(fields).length > 0 ? fields : undefined;
}

function mergeFields(defaults: LogFields | undefined, fields: LogFields | undefined) {
  return toLogObject({
    ...(defaults ?? {}),
    ...(fields ?? {}),
  });
}

function toWinstonLevel(level: LogMethodName) {
  switch (level) {
    case 'fatal':
      return 'error';
    case 'trace':
      return 'silly';
    default:
      return level;
  }
}

const basePinoLogger = pino(
  {
    level: loggerConfig.level,
    base: {
      env: loggerConfig.nodeEnv,
    },
    redact: loggerConfig.redactKeys,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
      }),
    },
    messageKey: 'msg',
  },
  buildDestination(loggerConfig),
);

export function buildFileLogger(config: LoggerConfig): WinstonLogger {
  mkdirSync(config.file.directory, { recursive: true });
  return createWinstonLogger({
    level: toWinstonLevel(config.level),
    defaultMeta: {
      app: config.appName,
      env: config.nodeEnv,
    },
    format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
    transports: [
      new DailyRotateFile({
        dirname: config.file.directory,
        filename: config.file.filenamePattern,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '100m',
        maxFiles: '14d',
      }),
    ],
  });
}

let fileLogger: WinstonLogger | null = null;
let fileLoggerFailed = false;

function getFileLogger(): WinstonLogger | null {
  if (fileLoggerFailed) {
    return null;
  }

  if (fileLogger) {
    return fileLogger;
  }

  try {
    fileLogger = buildFileLogger(loggerConfig);
    return fileLogger;
  } catch (error) {
    fileLoggerFailed = true;
    basePinoLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        logFileDir: loggerConfig.file.directory,
      },
      'winston file logger unavailable',
    );
    return null;
  }
}

function writeFileLog(level: LogMethodName, message: string, fields: LogFields | undefined) {
  const destination = getFileLogger();
  if (!destination) {
    return;
  }

  destination.log({
    level: toWinstonLevel(level),
    message,
    ...(fields ?? {}),
  });
}

function createWrappedLogger(logger: PinoLogger, defaults?: LogFields): LoggerClient {
  const log = (level: LogMethodName, message: string, fields?: LogFields) => {
    const payload = mergeFields(defaults, fields);

    if (payload) {
      logger[level](payload, message);
    } else {
      logger[level](message);
    }

    writeFileLog(level, message, payload);
  };

  return {
    fatal(message, fields) {
      log('fatal', message, fields);
    },
    error(message, fields) {
      log('error', message, fields);
    },
    warn(message, fields) {
      log('warn', message, fields);
    },
    info(message, fields) {
      log('info', message, fields);
    },
    debug(message, fields) {
      log('debug', message, fields);
    },
    trace(message, fields) {
      log('trace', message, fields);
    },
    child(scope, childDefaults) {
      const mergedDefaults = mergeFields(defaults, { scope, ...(childDefaults ?? {}) });
      const childLogger = logger.child({ scope, ...(childDefaults ?? {}) });
      return createWrappedLogger(childLogger, mergedDefaults);
    },
    withContext(contextDefaults) {
      const mergedDefaults = mergeFields(defaults, contextDefaults);
      const childLogger = logger.child(contextDefaults);
      return createWrappedLogger(childLogger, mergedDefaults);
    },
  };
}

const loggerCache = new Map<string, LoggerClient>();

export function createLogger(name?: string, defaults?: LogFields): LoggerClient {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return defaults
      ? createWrappedLogger(basePinoLogger.child(defaults), defaults)
      : createWrappedLogger(basePinoLogger);
  }

  const cacheKey = `name:${trimmedName}`;
  const cached = loggerCache.get(cacheKey);
  if (cached && !defaults) {
    return cached;
  }

  const namedDefaults = { logger: trimmedName, ...(defaults ?? {}) };
  const named = createWrappedLogger(basePinoLogger.child(namedDefaults), namedDefaults);

  if (!defaults) {
    loggerCache.set(cacheKey, named);
  }

  return named;
}

export const serverLogger = createLogger();

export function getLoggerConfig() {
  return loggerConfig;
}

export function hashLogValue(value: string): string {
  return createHash('sha256').update(`${loggerConfig.appName}:${value}`).digest('hex');
}
