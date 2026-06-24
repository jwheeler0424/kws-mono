import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { idPrimaryKey, timestamps } from './common.schema';

const providerValues = ['pgboss', 'graphile', 'in-memory'] as const;
const runOutcomeValues = ['success', 'failed', 'skipped', 'misfire'] as const;
const idempotencyStatusValues = ['processing', 'done', 'failed'] as const;

export const jobIdempotency = pgTable(
  'job_idempotency',
  {
    id: idPrimaryKey,
    dedupKey: text('dedup_key').notNull(),
    jobType: text('job_type').notNull(),
    status: text('status')
      .$type<(typeof idempotencyStatusValues)[number]>()
      .notNull()
      .default('processing'),
    correlationId: text('correlation_id'),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    failedAt: timestamp('failed_at', { withTimezone: true, mode: 'date' }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('job_idempotency_dedup_key_unique').on(table.dedupKey),
    index('job_idempotency_job_type_idx').on(table.jobType, table.status),
    index('job_idempotency_created_idx').on(table.createdAt),
    index('job_idempotency_status_created_idx').on(table.status, table.createdAt),
  ],
);

export const jobRuns = pgTable(
  'job_runs',
  {
    id: idPrimaryKey,
    jobType: text('job_type').notNull(),
    dedupKey: text('dedup_key'),
    correlationId: text('correlation_id'),
    provider: text('provider').$type<(typeof providerValues)[number]>().notNull(),
    outcome: text('outcome').$type<(typeof runOutcomeValues)[number]>().notNull(),
    attempt: integer('attempt').notNull().default(1),
    startedAt: timestamp('started_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    latencyMs: integer('latency_ms'),
    error: text('error'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  },
  (table) => [
    index('job_runs_job_type_idx').on(table.jobType, table.outcome, table.startedAt),
    index('job_runs_started_at_idx').on(table.startedAt),
    index('job_runs_correlation_idx').on(table.correlationId),
  ],
);

export const deadLetterEvents = pgTable(
  'dead_letter_events',
  {
    id: idPrimaryKey,
    jobType: text('job_type').notNull(),
    dedupKey: text('dedup_key'),
    correlationId: text('correlation_id'),
    provider: text('provider').$type<(typeof providerValues)[number]>().notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    error: text('error').notNull(),
    attempts: integer('attempts').notNull(),
    firstFailedAt: timestamp('first_failed_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    deadAt: timestamp('dead_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    replayedAt: timestamp('replayed_at', { withTimezone: true, mode: 'date' }),
    replayJobId: text('replay_job_id'),
    notes: text('notes'),
  },
  (table) => [
    index('dle_job_type_idx').on(table.jobType, table.deadAt),
    index('dle_correlation_idx').on(table.correlationId),
    index('dle_replayed_at_idx').on(table.replayedAt),
    index('dle_dedup_key_idx').on(table.dedupKey),
  ],
);

export const schedulerRegistry = pgTable(
  'scheduler_registry',
  {
    id: idPrimaryKey,
    scheduleKey: text('schedule_key').notNull(),
    cronExpr: text('cron_expr').notNull(),
    jobType: text('job_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    enabled: boolean('enabled').notNull().default(true),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    lastRunAt: timestamp('last_run_at', { withTimezone: true, mode: 'date' }),
    lastError: text('last_error'),
    autoDisabledAt: timestamp('auto_disabled_at', {
      withTimezone: true,
      mode: 'date',
    }),
    autoDisabledReason: text('auto_disabled_reason'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('scheduler_registry_schedule_key_unique').on(table.scheduleKey),
    index('scheduler_registry_job_type_idx').on(table.jobType),
    index('scheduler_registry_enabled_idx').on(table.enabled),
    index('scheduler_registry_enabled_job_type_idx').on(table.enabled, table.jobType),
    index('scheduler_registry_enabled_failure_idx').on(table.enabled, table.consecutiveFailures),
  ],
);

export const queueOperationAudit = pgTable(
  'queue_operation_audit',
  {
    id: idPrimaryKey,
    operation: text('operation').notNull(),
    targetId: text('target_id'),
    actor: text('actor'),
    approvalId: text('approval_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    ...timestamps,
  },
  (table) => [
    index('queue_operation_audit_operation_created_idx').on(table.operation, table.createdAt),
    index('queue_operation_audit_target_idx').on(table.targetId),
    index('queue_operation_audit_approval_idx').on(table.approvalId),
  ],
);
