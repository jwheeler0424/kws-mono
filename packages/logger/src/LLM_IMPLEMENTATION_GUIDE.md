# LLM Implementation Guide For Logger Usage

## Purpose

This document is for AI coding agents and contributors performing automated refactors. It defines
deterministic rules for adding logging in this repository.

## Non-Negotiable Rules

1. Import from `@/lib/logger` for application code.
2. Use `createLogger("featureName")` once per feature boundary.
3. Use `child("scope")` for subsystem/logical component boundaries.
4. Use structured fields for searchable values.
5. Do not add raw `console.*` to server or worker modules.
6. Do not log secrets, tokens, or raw PII.
7. Use `hashLogValue` for email-like identifiers when needed.
8. For scripts, use `scriptLogger` from `src/lib/logger/index.ts`.
9. For browser-only modules, use `createBrowserLogger` from `@/lib/logger`.
10. Preserve behavior-critical warning filters during migration.
11. Do not add pass-through logger wrappers that re-implement logger methods.

## Required Migration Pattern

When converting a file:

1. Add logger import.
2. Add feature logger constant near top-level declarations.
3. Replace console calls with logger calls.
4. Convert positional console payloads to structured field objects.
5. Keep original semantics and exit behavior.
6. Update tests that spy on console methods.
7. If a legacy logger facade exists, replace manual forwarding methods with a direct `LoggerClient`
   instance export.

## Message Style Rules

- Prefer short present-tense messages.
- Put IDs and mutable runtime state in fields.
- Use `error` level for failures requiring action.
- Use `warn` for degraded but recoverable paths.
- Use `info` for lifecycle milestones.
- Use `debug` or `trace` for high-volume diagnostics.

## Field Naming Rules

Use these names when applicable:

- `requestId`
- `correlationId`
- `traceId`
- `jobId`
- `jobType`
- `scheduleId`
- `attempt`
- `durationMs`
- `status`
- `error`

## Examples

### Good

```ts
logger.info('schedule restored', {
  scheduleId,
  jobType,
  status: 'active',
});
```

### Bad

```ts
console.info(`schedule restored ${scheduleId} ${jobType}`);
```

### Good error handling

```ts
logger.error('dispatch failed', {
  jobType,
  error: error instanceof Error ? error.message : String(error),
});
```

## Testing Rules

- Use spies on exported logger instances when available.
- Assert at least the message and one critical field.
- Avoid asserting full transport output formatting.

## Pull Request Checklist For Logger Changes

- No new server/worker `console.*` calls introduced.
- Feature logger + child scopes used consistently.
- Sensitive fields redacted or hashed.
- Existing warning suppression behavior preserved.
- Updated tests pass for touched areas.
- Documentation updated if new logging patterns are introduced.
