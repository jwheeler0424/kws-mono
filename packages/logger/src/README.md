# Logger Module

## Purpose

This folder provides the shared logging platform for the project.

It standardizes:

- Structured production logs
- Pretty local development logs
- Durable server-side file logs
- Named logger instances
- Redaction and PII-safe hashing support

## Files

- `index.ts`: public exports for application use
- `types.ts`: logger interfaces and shared types
- `config.ts`: environment parsing and defaults
- `server.ts`: server and worker logger implementation
- `browser.ts`: browser-safe logger implementation
- `logger.ts`: script runtime logger instance

## Public API

Import from:

```ts
import {
  createLogger,
  createBrowserLogger,
  scriptLogger,
  getLoggerConfig,
  hashLogValue,
} from '@/lib/logger';
```

### createLogger(name?)

```ts
const queueLogger = createLogger('queue');
queueLogger.info('worker started', { worker: 'executor' });
```

Use this for server and worker runtime code. Pass a name to attach logger origin metadata to each
event. Omit the name for a base logger without a name field.

### child scope

```ts
const queueLogger = createLogger('queue');
const schedulerLogger = queueLogger.child('scheduler');

schedulerLogger.info('startup', { registeredJobTypes: ['queue.system.noop'] });
```

### withContext

```ts
const logger = createLogger('email').withContext({
  campaignId: 'cmp_123',
});
logger.info('delivery attempted', { sendId: 'send_1' });
```

### createBrowserLogger(name?)

Browser-safe logger with the same call shape as `LoggerClient`. Use this only in client/UI code.

### No Local Wrapper Rule

Do not create local pass-through logger wrappers that re-implement methods like `info`, `warn`,
`error`, or `trace` by forwarding to another logger.

Preferred:

```ts
import { createLogger } from '@/lib/logger';

export const featureLogger = createLogger('feature').child('sync');
```

Allowed only when strictly needed:

- A tiny compatibility layer during migration
- Additional behavior that cannot be expressed with `child` or `withContext`

If you keep a compatibility export, bind it directly to a `LoggerClient` instance instead of
implementing each method manually.

### scriptLogger

Dedicated logger for scripts in the `scripts` folder. Uses the shared server logger transport and
supports pretty mode when enabled.

### getLoggerConfig

Returns parsed logger config from environment variables.

### hashLogValue

Hashes values with deterministic `sha256(APP_NAME + ":" + value)`. Use this for PII-safe correlation
in production logs.

## Log Event Shape

All loggers emit `msg` plus structured fields. Common fields include:

- `env`
- `logger` (when created via `createLogger("name")`)
- `scope`
- event metadata (`jobType`, `scheduleId`, `attempt`, etc)

## Environment Variables

- `LOG_LEVEL` default: `info`
- `LOG_PRETTY` default: true outside production
- `LOG_REDACT_KEYS` default includes common secret keys

## Runtime Behavior

### Development

- Pretty output enabled by default unless explicitly disabled
- Server logs are also written to `logs/<APP_NAME>.log` via Winston
- Useful for local debugging and watch mode output

### Production

- JSON output intended for ingestion pipelines
- Server logs continue to be persisted to `logs/<APP_NAME>.log` via Winston
- Redaction enabled based on configured keys

## Best Practices

- Create one root logger per feature
- Use `child` for subsystems and runtime boundaries
- Keep log messages short and action-oriented
- Put searchable details in structured fields, not only text
- Never log raw secrets or raw PII in production
- Use `hashLogValue` for email-like identifiers when correlation is needed

## Anti-Patterns

- Creating ad-hoc pino instances in feature files
- Logging sensitive payloads directly
- Mixing browser logger imports into server-only modules
- Using message strings as the only source of diagnostics data

## Migration Checklist

Use this checklist when migrating an existing module to shared logger APIs.

- Replace ad-hoc logger or `console.*` imports with `createLogger` (server/worker) or
  `createBrowserLogger` (browser).
- Create one feature root logger at module boundary.
- Replace local pass-through wrapper objects with direct logger exports.
- Convert subsystem logs to `child("scope")` loggers.
- Move repeated metadata to `withContext`.
- Convert positional log payloads into structured fields.
- Hash PII-like fields with `hashLogValue` before logging.
- Ensure no secrets/tokens are logged.
- Update tests to spy on logger instances instead of global console.
- Run typecheck and targeted tests before merge.

Exit criteria:

- No new server or worker `console.*` calls.
- No method-by-method logger forwarding wrappers.
- Logs include stable fields for filtering (`jobType`, `scheduleId`, `requestId`, etc).

## Quick Example

```ts
import { createLogger, hashLogValue } from '@/lib/logger';

const logger = createLogger('email').child('dispatcher');

export async function dispatchEmail(sendId: string, recipient: string) {
  logger.info('dispatch started', {
    sendId,
    recipientHash: hashLogValue(recipient.toLowerCase()),
  });

  try {
    // perform send
    logger.info('dispatch completed', { sendId, status: 'sent' });
  } catch (error) {
    logger.error('dispatch failed', {
      sendId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```
