import { parseCronExpression } from 'cron-schedule';
import { z } from 'zod';
import './preload.ts';

import { KEY_FIELDS_PREFIX, ORIGINATING_SYSTEM_NAMES, RESOURCE_NAMING } from '../constants/mls';

const keyPrefixSchema = z.enum(KEY_FIELDS_PREFIX);
const cronScheduleSchema = z.string().superRefine((value, ctx) => {
  const result = parseCronExpression(value);
  const isValid = result !== null;
  if (!isValid) {
    ctx.addIssue({
      code: 'custom',
      message: `Invalid cron schedule "${value}"`,
    });
  }
});
const resourceExpandableSchema = z.string().superRefine((value, ctx) => {
  const [resource, expandable, ...rest] = value.split(':');

  if (!resource || !expandable || rest.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Expected format Resource:Expandable',
    });
    return;
  }

  if (!(resource in RESOURCE_NAMING)) {
    ctx.addIssue({
      code: 'custom',
      message: `Unknown resource "${resource}"`,
    });
    return;
  }

  const allowed = RESOURCE_NAMING[resource as keyof typeof RESOURCE_NAMING].ExpandableResources;

  if (!allowed.some((item) => item === expandable)) {
    ctx.addIssue({
      code: 'custom',
      message: `"${expandable}" is not valid for "${resource}"`,
    });
  }
});

const resourceCronSchema = z.string().superRefine((value, ctx) => {
  const [resource, cronSchedule, ...rest] = value.split(':');

  if (!resource || !cronSchedule || rest.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Expected format Resource:CronSchedule',
    });
    return;
  }
  const result = parseCronExpression(cronSchedule);
  const isValid = result !== null;

  if (!isValid) {
    ctx.addIssue({
      code: 'custom',
      message: `Invalid cron schedule "${cronSchedule}"`,
    });
    return;
  }
});

const envSchema = z.object({
  // ── MLS configuration ────────────────────────────────────────────────────────
  /* -- Test Credentials -- */
  MLS_TEST_ACCESS_KEY: z.hash('sha1').optional(),
  MLS_TEST_API_URL: z.httpUrl().optional(),

  /* -- Live Credentials -- */
  MLS_ACCESS_KEY: z.hash('sha1'),
  MLS_API_URL: z.httpUrl(),

  /* -- MLS Credentials -- */
  MLS_ORIGINATING_SYSTEM_NAME: z.enum(ORIGINATING_SYSTEM_NAMES),
  MLS_OFFICE_ID: z
    .string()
    .transform((value) => value.split(',').map((s) => s.trim()))
    .pipe(
      z.array(
        z
          .string()
          .refine((value) => keyPrefixSchema.options.some((prefix) => value.startsWith(prefix)), {
            message: `Must start with one of: ${keyPrefixSchema.options.join(', ')}`,
          }),
      ),
    )
    .optional(),
  MLS_MEMBER_ID: z
    .string()
    .transform((value) => value.split(',').map((s) => s.trim()))
    .pipe(
      z.array(
        z
          .string()
          .refine((value) => keyPrefixSchema.options.some((prefix) => value.startsWith(prefix)), {
            message: `Must start with one of: ${keyPrefixSchema.options.join(', ')}`,
          }),
      ),
    )
    .optional(), // Split comma-separated member IDs into an array
  MLS_RESOURCE_EXPAND: z
    .string()
    .transform((str) => str.split(',').map((s) => s.trim()))
    .pipe(z.array(resourceExpandableSchema))
    .optional(),
  MLS_START_DATE: z.iso
    .datetime({ offset: true })
    .transform((str) => new Date(str))
    .optional(), // Coerce string to Date object

  /* -- MLS sync config (preferred keys) -- */
  MLS_PAGE_SIZE: z.coerce.number().int().positive(),
  MLS_MAX_PAGE_SIZE_WITH_EXPAND: z.coerce.number().int().positive(),
  MLS_REQUEST_DELAY_MS: z.coerce.number().int().positive(),
  MLS_REQUESTS_PER_SECOND: z.coerce.number().int().positive(),
  MLS_REQUEST_THROTTLE_CURVE_POWER: z.coerce.number().int().positive(),
  MLS_REQUEST_THROTTLE_MAX_DELAY_MS: z.coerce.number().int().positive(),
  MLS_DELTA_OVERLAP_MS: z.coerce.number().int().nonnegative(),
  MLS_REQUESTS_PER_HOUR_LIMIT: z.coerce.number().int().positive(),
  MLS_REQUESTS_PER_DAY_LIMIT: z.coerce.number().int().positive(),
  MLS_BYTES_PER_HOUR_LIMIT: z.coerce.number().int().positive(),
  MLS_BYTES_PER_DAY_LIMIT: z.coerce.number().int().positive(),
  MLS_QUOTA_WARN_THRESHOLD_RATIO: z.coerce.number().nonnegative(),
  MLS_QUOTA_STATE_FILE: z.string().min(1),
  MLS_CLEANUP_RETENTION_DAYS: z.coerce.number().int().positive(),

  /* -- MLS Scheduler config -- */
  MLS_QUEUE_ENABLE_HOURLY_SYNC: z.union([z.boolean(), z.stringbool()]),
  MLS_QUEUE_RESOURCE_CRON_SCHEDULES: z
    .string()
    .transform((str) => str.split(';').map((s) => s.trim()))
    .pipe(z.array(resourceCronSchema)),
  MLS_QUEUE_INITIAL_STRICT_SUCCESS: z.union([z.boolean(), z.stringbool()]),
  MLS_QUEUE_ENABLE_CLEANUP: z.union([z.boolean(), z.stringbool()]),
  MLS_QUEUE_CLEANUP_CRON: cronScheduleSchema,
  MLS_QUEUE_OPENHOUSE_RECONCILIATION_CRON: cronScheduleSchema,
  MLS_QUEUE_MEDIA_SYNC_CRON: cronScheduleSchema,
  MLS_QUEUE_MEDIA_SYNC_BATCH_SIZE: z.coerce.number().int().positive().optional(),
  MLS_QUEUE_MEDIA_SYNC_MAX_BATCHES: z.coerce.number().int().positive().optional(),
  MLS_QUEUE_MEDIA_SYNC_PROCESS_CONCURRENCY: z.coerce.number().int().positive().optional(),
  MLS_QUEUE_MEDIA_SYNC_JOB_CONCURRENCY: z.coerce.number().int().positive().optional(),
  MLS_QUEUE_MEDIA_RECONCILE_CRON: cronScheduleSchema.optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
