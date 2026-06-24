# Logger Integration Guide

## Goal

Use the shared logger module in new or existing features without introducing ad-hoc logging
patterns.

## Integration Checklist

1. Create a feature logger near the feature boundary.
2. Derive child loggers for adapters, workers, handlers, and services.
3. Emit structured fields for identifiers and lifecycle state.
4. Hash PII-sensitive values before logging in production.
5. Avoid direct `console.*` in server and worker code.
6. Keep browser logging on browser-safe logger APIs.
7. Do not create pass-through logger proxy objects.

## Step 1: Add a Feature Logger

Create a feature-scoped logger once and reuse it.

```ts
import { createLogger } from '@/lib/logger';

const billingLogger = createLogger('billing');
```

## Step 2: Add Subsystem Scope

```ts
const webhookLogger = billingLogger.child('webhook');
const retryLogger = billingLogger.child('retry');
```

Use short stable scope names for easier filtering.

Do not wrap these loggers in local objects that manually forward methods. Export the logger
instances directly.

## Step 3: Replace console Logging

Before:

```ts
console.info('[billing:webhook] received', payload);
```

After:

```ts
webhookLogger.info('received', {
  webhookId: payload.id,
  eventType: payload.type,
});
```

## Step 4: Normalize Error Logging

```ts
try {
  await doWork();
} catch (error) {
  webhookLogger.error('processing failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}
```

## Step 5: Use Context for Repeated Metadata

```ts
const requestLogger = webhookLogger.withContext({
  requestId,
  tenantId,
});

requestLogger.info('validation passed');
requestLogger.info('delivery complete', { statusCode: 202 });
```

## Step 6: Handle PII Safely

```ts
import { hashLogValue } from '@/lib/logger';

requestLogger.info('recipient resolved', {
  recipientHash: hashLogValue(email.toLowerCase()),
});
```

## Server Route Pattern

```ts
import { createLogger } from '@/lib/logger';

const logger = createLogger('api').child('webhooks');

export async function handleWebhook(req: Request) {
  logger.info('request received', { method: req.method });
  // ...
}
```

## Worker Pattern

```ts
import { createLogger } from '@/lib/logger';

const logger = createLogger('queue').child('executor');

logger.info('worker start');
```

## Script Pattern

```ts
import { scriptLogger } from '../src/lib/logger/index.ts';

scriptLogger.error('watchdog timeout reached', { timeoutMs });
```

## Browser Pattern

```ts
import { createBrowserLogger } from '@/lib/logger';

const uiLogger = createBrowserLogger('ui').child('overflow');
uiLogger.warn('grid template unavailable');
```

## Testing Guidance

- Spy on logger instances, not global console.
- Assert on semantic message and critical fields.
- Avoid brittle snapshots of full serialized output.

Example:

```ts
const infoSpy = vi.spyOn(webhookLogger, 'info').mockImplementation(() => {});
expect(infoSpy).toHaveBeenCalledWith('started', expect.objectContaining({ id }));
```

## Migration Strategy For Existing Feature

1. Introduce feature logger constant.
2. Convert error logs first.
3. Convert startup and lifecycle logs.
4. Convert noisy debug logs last and evaluate level.
5. Update tests from console spies to logger spies.
6. Run feature test suite.

## Copy/Paste Migration Checklist

- [ ] Replace `console.*` and ad-hoc logger imports with shared logger API.
- [ ] Add one root logger with `createLogger("feature")`.
- [ ] Replace local method-forwarding logger objects with direct logger instances.
- [ ] Introduce `child("scope")` for subsystem boundaries.
- [ ] Use `withContext` for repeated identifiers.
- [ ] Convert log calls to message + structured fields.
- [ ] Hash PII-like values via `hashLogValue` where needed.
- [ ] Update tests to spy on logger objects.
- [ ] Run typecheck and relevant tests.

## Observability Conventions

Use stable field names where possible:

- `event`
- `status`
- `jobType`
- `scheduleId`
- `attempt`
- `durationMs`
- `requestId`
- `correlationId`

## Do Not

- Log full unfiltered payloads from external systems.
- Duplicate the same identifier in message text and fields unless required.
- Import server logger modules into browser-only components.
