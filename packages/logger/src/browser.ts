import type { LogFields, LoggerClient } from './types';

const browserLoggerCache = new Map<string, LoggerClient>();

function hasFields(fields: LogFields | undefined): fields is LogFields {
  return Boolean(fields && Object.keys(fields).length > 0);
}

function createBrowserLogger(prefix?: string, defaults?: LogFields): LoggerClient {
  const withDefaults = (fields?: LogFields) => ({
    ...(defaults ?? {}),
    ...(fields ?? {}),
  });

  const print = (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: LogFields,
  ) => {
    const payload = withDefaults(fields);

    if (hasFields(payload)) {
      console[level](prefix ? `[${prefix}] ${message}` : message, payload);
      return;
    }

    console[level](prefix ? `[${prefix}] ${message}` : message);
  };

  return {
    fatal(message, fields) {
      print('error', message, fields);
    },
    error(message, fields) {
      print('error', message, fields);
    },
    warn(message, fields) {
      print('warn', message, fields);
    },
    info(message, fields) {
      print('info', message, fields);
    },
    debug(message, fields) {
      print('debug', message, fields);
    },
    trace(message, fields) {
      print('debug', message, fields);
    },
    child(scope, scopeDefaults) {
      const childPrefix = prefix ? `${prefix}.${scope}` : scope;
      return createBrowserLogger(childPrefix, withDefaults(scopeDefaults));
    },
    withContext(contextDefaults) {
      return createBrowserLogger(prefix, withDefaults(contextDefaults));
    },
  };
}

export function createLogger(name?: string, defaults?: LogFields): LoggerClient {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return createBrowserLogger(undefined, defaults);
  }

  const cached = browserLoggerCache.get(trimmedName);
  if (cached && !defaults) {
    return cached;
  }

  const named = createBrowserLogger(trimmedName, defaults);
  if (!defaults) {
    browserLoggerCache.set(trimmedName, named);
  }

  return named;
}
