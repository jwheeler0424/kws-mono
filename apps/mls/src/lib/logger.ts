import { createLogger, type LogFields, type LoggerClient, type LogLevel } from '@kws/logger';

export type { LogLevel };

export interface LogContext extends LogFields {
  resource?: string;
  osn?: string;
  page?: number;
  recordCount?: number;
}

export const mlsLogger = createLogger('mls-grid');

// Backward-compatible sync-scoped logger used by existing MLS utils.
export const logger: LoggerClient = mlsLogger.child('sync');