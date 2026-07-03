import { env } from '@kws/config';

import type { MlsResource } from '@/types';

import { MLS_RESOURCE_NAMES } from '@/lib/constants';
import { mlsLogger } from '@/lib/logger';

import { runMlsCleanup } from './cleanup';
import { isMlsDeltaResourceName, runDeltaSyncResource } from './orchestrator';
import { runMlsMediaSync } from './seed-media';

export const MLS_INITIAL_TRIGGER_JOB_TYPE = 'mls.sync.initial.trigger';
export const MLS_INITIAL_PIPELINE_JOB_TYPE = 'mls.sync.initial.pipeline';
export const MLS_DELTA_TRIGGER_JOB_TYPE = 'mls.sync.delta.trigger';
export const MLS_DELTA_PIPELINE_JOB_TYPE = 'mls.sync.delta.pipeline';
export const MLS_DELTA_HOURLY_SCHEDULE_ID = 'mls.delta.hourly';
export const MLS_DELTA_RESOURCE_PIPELINE_JOB_TYPE = 'mls.sync.delta.resource.pipeline';
export const MLS_CLEANUP_JOB_TYPE = 'mls.sync.cleanup';
export const MLS_CLEANUP_HOURLY_SCHEDULE_ID = 'mls.cleanup.hourly';
export const MLS_OPENHOUSE_RECONCILE_JOB_TYPE = 'mls.sync.openhouse.reconcile';
export const MLS_OPENHOUSE_RECONCILE_HOURLY_SCHEDULE_ID = 'mls.openhouse.reconcile.hourly';
export const MLS_MEDIA_SYNC_JOB_TYPE = 'mls.sync.media';
export const MLS_MEDIA_SYNC_SCHEDULE_ID = 'mls.media.sync';

const DEFAULT_SCHEDULED_MEDIA_SYNC_BATCH_SIZE = 50;
const DEFAULT_SCHEDULED_MEDIA_SYNC_MAX_BATCHES = 5;
const DEFAULT_SCHEDULED_MEDIA_SYNC_PROCESS_CONCURRENCY = 3;

const DEFAULT_RESOURCE_CRON: Record<MlsResource, string> = {
  Lookup: '0 6 * * *',
  Property: '10 * * * *',
  Office: '15 * * * *',
  Member: '20 * * * *',
  OpenHouse: '25 * * * *',
};

const syncMlsLogger = mlsLogger.child('mls-sync');
const registeredMlsCronJobs: Array<{ stop: () => unknown }> = [];

function defaultResourceScheduleId(resource: MlsResource) {
  return `mls.delta.hourly.${resource.toLowerCase()}`;
}

function resolveMlsDeltaResourceSchedules() {
  const enabled = env.MLS_QUEUE_ENABLE_HOURLY_SYNC;
  const overrides = new Map<MlsResource, string>();
  for (const value of env.MLS_QUEUE_RESOURCE_CRON_SCHEDULES) {
    const [rawResource, rawCron] = value.split(':', 2);
    const resource = rawResource?.trim();
    const cronExpression = rawCron?.trim();
    if (!resource || !cronExpression || !isMlsDeltaResourceName(resource)) {
      continue;
    }
    overrides.set(resource, cronExpression);
  }

  return MLS_RESOURCE_NAMES.map((resource) => ({
    scheduleId: defaultResourceScheduleId(resource),
    resource,
    cronExpression: overrides.get(resource) ?? DEFAULT_RESOURCE_CRON[resource],
    syncFunction: runDeltaSyncResource.bind(null, resource),
    enabled,
  }));
}

function isFatalScheduledError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeFatal = (error as Error & { fatal?: unknown }).fatal;
  if (maybeFatal === true) {
    return true;
  }

  const name = error.name.toLowerCase();
  if (name.includes('fatal')) {
    return true;
  }

  return false;
}

async function runScheduledJob(scheduleId: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    if (isFatalScheduledError(error)) {
      syncMlsLogger.fatal('fatal scheduled MLS job error; terminating process', {
        scheduleId,
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }

    syncMlsLogger.error('scheduled MLS job failed; scheduler will continue', {
      scheduleId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

function resolveMlsCleanupSchedule() {
  const enabled = env.MLS_QUEUE_ENABLE_CLEANUP;
  const cronExpression = env.MLS_QUEUE_CLEANUP_CRON || '2 * * * *';

  return {
    scheduleId: MLS_CLEANUP_HOURLY_SCHEDULE_ID,
    cronExpression,
    cleanupFunction: runMlsCleanup,
    enabled,
  };
}

function resolveMlsMediaSyncSchedule() {
  const enabled = true;
  const cronExpression = env.MLS_QUEUE_MEDIA_SYNC_CRON || '*/15 * * * *';

  return {
    scheduleId: MLS_MEDIA_SYNC_SCHEDULE_ID,
    cronExpression,
    enabled,
  };
}

function resolveScheduledMediaSyncBatchSize() {
  return Math.max(
    1,
    env.MLS_QUEUE_MEDIA_SYNC_BATCH_SIZE ?? DEFAULT_SCHEDULED_MEDIA_SYNC_BATCH_SIZE,
  );
}

function resolveScheduledMediaSyncMaxBatches() {
  return Math.max(
    1,
    env.MLS_QUEUE_MEDIA_SYNC_MAX_BATCHES ?? DEFAULT_SCHEDULED_MEDIA_SYNC_MAX_BATCHES,
  );
}

function resolveScheduledMediaSyncProcessConcurrency() {
  return Math.max(
    1,
    env.MLS_QUEUE_MEDIA_SYNC_PROCESS_CONCURRENCY ??
      DEFAULT_SCHEDULED_MEDIA_SYNC_PROCESS_CONCURRENCY,
  );
}

function resolveScheduledMediaSyncIncludeMissingFilesRepair() {
  return env.MLS_QUEUE_MEDIA_SYNC_INCLUDE_MISSING_FILES_REPAIR ?? false;
}

function resolveScheduledMediaSyncRepairMaxBatches(maxBatches: number) {
  const configured = env.MLS_QUEUE_MEDIA_SYNC_REPAIR_MAX_BATCHES;
  if (!configured) {
    return Math.min(2, maxBatches);
  }
  return Math.max(1, Math.min(configured, maxBatches));
}

export function listMlsDeltaScheduleIds() {
  return resolveMlsDeltaResourceSchedules().map((entry) => entry.scheduleId);
}

export function listMlsManagedScheduleIds() {
  return [
    ...listMlsDeltaScheduleIds(),
    resolveMlsCleanupSchedule().scheduleId,
    resolveMlsMediaSyncSchedule().scheduleId,
  ];
}

export function registerMlsSyncJobTypes() {
  for (const job of registeredMlsCronJobs) {
    job.stop();
  }
  registeredMlsCronJobs.length = 0;

  const scheduleEntries = resolveMlsDeltaResourceSchedules();
  const cleanupSchedule = resolveMlsCleanupSchedule();
  const mediaSyncSchedule = resolveMlsMediaSyncSchedule();
  const mediaSyncBatchSize = resolveScheduledMediaSyncBatchSize();
  const mediaSyncMaxBatches = resolveScheduledMediaSyncMaxBatches();
  const mediaSyncProcessConcurrency = resolveScheduledMediaSyncProcessConcurrency();
  const mediaSyncIncludeMissingFilesRepair = resolveScheduledMediaSyncIncludeMissingFilesRepair();
  const mediaSyncRepairMaxBatches = resolveScheduledMediaSyncRepairMaxBatches(mediaSyncMaxBatches);

  for (const entry of scheduleEntries) {
    const job = Bun.cron(entry.cronExpression, async () => {
      if (!entry.enabled) {
        syncMlsLogger.debug('skipping disabled schedule', {
          scheduleId: entry.scheduleId,
          resource: entry.resource,
        });
        return;
      }

      await runScheduledJob(entry.scheduleId, async () => {
        await entry.syncFunction();
      });
    });
    registeredMlsCronJobs.push(job);
  }

  const cleanupJob = Bun.cron(cleanupSchedule.cronExpression, async () => {
    if (!cleanupSchedule.enabled) {
      syncMlsLogger.debug('skipping disabled cleanup schedule', {
        scheduleId: cleanupSchedule.scheduleId,
      });
      return;
    }

    await runScheduledJob(cleanupSchedule.scheduleId, async () => {
      await cleanupSchedule.cleanupFunction();
    });
  });
  registeredMlsCronJobs.push(cleanupJob);

  const mediaSyncJob = Bun.cron(mediaSyncSchedule.cronExpression, async () => {
    if (!mediaSyncSchedule.enabled) {
      syncMlsLogger.debug('skipping disabled media sync schedule', {
        scheduleId: mediaSyncSchedule.scheduleId,
      });
      return;
    }

    await runScheduledJob(mediaSyncSchedule.scheduleId, async () => {
      await runMlsMediaSync({
        batchSize: mediaSyncBatchSize,
        maxBatches: mediaSyncMaxBatches,
        processConcurrency: mediaSyncProcessConcurrency,
        prioritizeMemberKeys: env.MLS_MEMBER_ID ?? [],
        prioritizeOfficeKeys: env.MLS_OFFICE_ID ?? [],
        includeMissingFilesRepair: mediaSyncIncludeMissingFilesRepair,
        repairMaxBatches: mediaSyncRepairMaxBatches,
      });
    });
  });
  registeredMlsCronJobs.push(mediaSyncJob);

  syncMlsLogger.info('MLS sync schedule job types registered', {
    deltaSchedules: scheduleEntries.map((entry) => ({
      scheduleId: entry.scheduleId,
      resource: entry.resource,
      cronExpression: entry.cronExpression,
      enabled: entry.enabled,
    })),
    cleanupSchedule: {
      scheduleId: cleanupSchedule.scheduleId,
      cronExpression: cleanupSchedule.cronExpression,
      enabled: cleanupSchedule.enabled,
    },
    mediaSyncSchedule: {
      scheduleId: mediaSyncSchedule.scheduleId,
      cronExpression: mediaSyncSchedule.cronExpression,
      enabled: mediaSyncSchedule.enabled,
      batchSize: mediaSyncBatchSize,
      maxBatches: mediaSyncMaxBatches,
      processConcurrency: mediaSyncProcessConcurrency,
      includeMissingFilesRepair: mediaSyncIncludeMissingFilesRepair,
      repairMaxBatches: mediaSyncRepairMaxBatches,
      prioritizedMemberKeysCount: (env.MLS_MEMBER_ID ?? []).length,
      prioritizedOfficeKeysCount: (env.MLS_OFFICE_ID ?? []).length,
    },
  });
}
