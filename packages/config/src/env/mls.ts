import { parseCronExpression } from 'cron-schedule';
import { z } from 'zod';

import { KEY_FIELDS_PREFIX, ORIGINATING_SYSTEM_NAMES, RESOURCE_NAMING } from '../constants/mls';
import './preload.ts';

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
  MLS_MEDIA_STORE_PATH: z.string().min(1).optional(),

  /* -- MLS Scheduler config -- */
  MLS_QUEUE_RESOURCE_CRON_SCHEDULES: z
    .string()
    .transform((str) => str.split(';').map((s) => s.trim()))
    .pipe(z.array(resourceCronSchema)),
  MLS_QUEUE_CLEANUP_CRON: cronScheduleSchema,
  MLS_QUEUE_MEDIA_SYNC_CRON: cronScheduleSchema,
  MLS_QUEUE_MEDIA_RECONCILE_CRON: cronScheduleSchema.optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
