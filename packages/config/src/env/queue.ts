import { z } from 'zod';

import './preload.ts';

const emptyStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalTrimmedString = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalHttpUrl = z.preprocess(emptyStringToUndefined, z.httpUrl().optional());

const envSchema = z.object({
  // ── Alerting and monitoring ─────────────────────────────────────────────────
  ALERT_SERVICE_NAME: optionalTrimmedString,
  ALERT_WEBHOOK_URL: optionalHttpUrl,
  ALERT_WEBHOOK_SECRET: optionalTrimmedString,
  ALERT_DLQ_THRESHOLD: z.coerce.number().int().min(0).default(5),
  ALERT_WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // ── Queue retention cleanup ───────────────────────────────────────────────
  QUEUE_RETENTION_ENABLE_AUTOCLEANUP: z.union([z.boolean(), z.stringbool()]).default(true),
  QUEUE_RETENTION_CLEANUP_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 1000),
  QUEUE_RETENTION_IDEMPOTENCY_HOURS: z.coerce.number().int().positive().default(48),
  QUEUE_RETENTION_DEADLETTER_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .default(24 * 7),
  QUEUE_RETENTION_JOB_RUNS_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .default(24 * 7),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
