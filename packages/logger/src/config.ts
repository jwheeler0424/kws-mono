import path from 'node:path';

import coreEnv from '@/config/env/core';

import type { LoggerConfig, LoggerFileConfig, LogLevel } from './types';

const DEFAULT_REDACT_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'apiKey',
  'secret',
  'headers.authorization',
];

function parseLevel(value: string | undefined): LogLevel {
  const normalized = value?.toLowerCase();
  switch (normalized) {
    case 'log':
      return 'info';
    case 'fatal':
    case 'error':
    case 'warn':
    case 'info':
    case 'debug':
    case 'trace':
      return normalized;
    default:
      return 'info';
  }
}

type LoggerEnvSource = {
  APP_NAME?: string;
  NODE_ENV?: string;
  LOG_LEVEL?: string;
  LOG_PRETTY?: boolean;
  LOG_REDACT_KEYS?: string[];
};

function toFileSafeName(value: string | undefined): string {
  const normalized = value
    ?.trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'app';
}

function buildFileConfig(appName: string): LoggerFileConfig {
  const directory = path.resolve(process.cwd(), 'logs');
  const baseName = toFileSafeName(appName);
  const filename = `${baseName}.log`;
  const filenamePattern = `${baseName}-%DATE%.log`;

  return {
    directory,
    filename,
    filenamePattern,
    path: path.join(directory, filename),
  };
}

export function loadLoggerConfig(source: LoggerEnvSource = coreEnv): LoggerConfig {
  const nodeEnv = source.NODE_ENV?.trim() || 'development';
  const appName = source.APP_NAME?.trim() || 'app';
  const pretty = source.LOG_PRETTY ?? nodeEnv !== 'production';
  const redactKeys = Array.from(
    new Set([...DEFAULT_REDACT_KEYS, ...(source.LOG_REDACT_KEYS?.filter(Boolean) ?? [])]),
  );

  return {
    appName,
    nodeEnv,
    level: parseLevel(source.LOG_LEVEL),
    pretty,
    redactKeys,
    file: buildFileConfig(appName),
  };
}
