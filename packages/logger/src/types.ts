export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type LogFields = Record<string, unknown>;

export interface LoggerFileConfig {
  directory: string;
  /** Base filename without date substitution, e.g. "mls-grid.log" */
  filename: string;
  /** Daily-rotation pattern passed to DailyRotateFile, e.g. "mls-grid-%DATE%.log" */
  filenamePattern: string;
  /** Full path using the base filename (no date), for reference */
  path: string;
}

export interface LoggerClient {
  fatal(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  trace(message: string, fields?: LogFields): void;
  child(scope: string, defaults?: LogFields): LoggerClient;
  withContext(defaults: LogFields): LoggerClient;
}

export interface LoggerConfig {
  appName: string;
  nodeEnv: string;
  level: LogLevel;
  pretty: boolean;
  redactKeys: string[];
  file: LoggerFileConfig;
}
