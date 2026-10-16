import { env } from '@kws/config';

import type { MlsResource } from '@/types';

import { MLS_RESOURCE_NAMES, MLS_SCHEDULER_DEFAULTS } from '@/lib/constants';
import { pruneExpiredHistory } from '@/lib/history-store';
import { mlsLogger } from '@/lib/logger';

import {
  pruneEmptyMlsMediaDirectories,
  pruneMlsMediaNamespacesWithoutLinkedMedia,
  purgeDeadMlsMedia,
  purgeOrphanedMlsMediaFiles,
  purgeSoftDeletedMlsMedia,
  purgeUnavailableMlsMedia,
  purgeScopedMlsMediaBeforeSync,
} from '../repositories/media-cleanup.repository';
import { isInitialSeedComplete } from '../repositories/seed-state.repository';
import { runMlsCleanup } from './cleanup';
import { refreshMlsMediaQueue } from './media-queue-refresh';
import { isMlsDeltaResourceName, runDeltaSyncResource } from './orchestrator';
import { runPrioritizedMlsMediaSync } from './seed-media';

const MLS_CLEANUP_HOURLY_SCHEDULE_ID = 'mls.cleanup.hourly';
const MLS_MEDIA_SYNC_SCHEDULE_ID = 'mls.media.sync';
const MLS_MEDIA_RECONCILE_SCHEDULE_ID = 'mls.media.reconcile';
const MLS_MEDIA_ORPHAN_CLEANUP_SCHEDULE_ID = 'mls.media.orphan-cleanup';
const MLS_HISTORY_PRUNE_SCHEDULE_ID = 'mls.history.prune';
const MLS_MEDIA_MUTATION_SCHEDULE_IDS = new Set([
  MLS_CLEANUP_HOURLY_SCHEDULE_ID,
  MLS_MEDIA_SYNC_SCHEDULE_ID,
  MLS_MEDIA_RECONCILE_SCHEDULE_ID,
]);

const DEFAULT_RESOURCE_CRON: Record<MlsResource, string> = {
  Lookup: '0 6 * * *',
  Property: '10 * * * *',
  Office: '15 * * * *',
  Member: '20 * * * *',
  OpenHouse: '25 * * * *',
};

const syncMlsLogger = mlsLogger.child('mls-sync');
const registeredMlsCronJobs: Array<{ stop: () => unknown }> = [];
const inFlightScheduledJobs = new Set<string>();

function resolveMaxConcurrentScheduledJobs() {
  return Math.max(1, MLS_SCHEDULER_DEFAULTS.maxConcurrentScheduledJobs);
}

function defaultResourceScheduleId(resource: MlsResource) {
  return `mls.delta.hourly.${resource.toLowerCase()}`;
}

function resolveMlsDeltaResourceSchedules() {
  const enabled = true;
  const overrides = new Map<MlsResource, string>();
  for (const value of env.MLS_RESOURCE_CRON_SCHEDULES) {
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
  const conflictingJob =
    scheduleId === MLS_MEDIA_ORPHAN_CLEANUP_SCHEDULE_ID
      ? [...MLS_MEDIA_MUTATION_SCHEDULE_IDS].find((jobId) => inFlightScheduledJobs.has(jobId))
      : MLS_MEDIA_MUTATION_SCHEDULE_IDS.has(scheduleId) &&
          inFlightScheduledJobs.has(MLS_MEDIA_ORPHAN_CLEANUP_SCHEDULE_ID)
        ? MLS_MEDIA_ORPHAN_CLEANUP_SCHEDULE_ID
        : undefined;

  if (conflictingJob) {
    syncMlsLogger.warn('skipping scheduled MLS job because a media cleanup conflict is active', {
      scheduleId,
      conflictingJob,
    });
    return;
  }

  const maxConcurrentScheduledJobs = resolveMaxConcurrentScheduledJobs();

  if (inFlightScheduledJobs.size >= maxConcurrentScheduledJobs) {
    syncMlsLogger.warn('skipping scheduled MLS job because max concurrency was reached', {
      scheduleId,
      activeJobs: inFlightScheduledJobs.size,
      maxConcurrentScheduledJobs,
    });
    return;
  }

  if (inFlightScheduledJobs.has(scheduleId)) {
    syncMlsLogger.warn('skipping scheduled MLS job because previous run is still active', {
      scheduleId,
    });
    return;
  }

  inFlightScheduledJobs.add(scheduleId);

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
  } finally {
    inFlightScheduledJobs.delete(scheduleId);
  }
}

async function isSeedCompleteFor(job: string): Promise<boolean> {
  if (await isInitialSeedComplete(env.MLS_ORIGINATING_SYSTEM_NAME)) return true;
  // Partial MLS data would make cleanup treat unsynced records' media as orphaned.
  syncMlsLogger.warn('skipping MLS media job until the initial seed completes', { job });
  return false;
}

async function runOrphanedMediaCleanup(trigger: 'startup' | 'scheduled') {
  if (!(await isSeedCompleteFor(`orphan-cleanup:${trigger}`))) return;
  const softDeletedMediaSummary = await purgeSoftDeletedMlsMedia();
  const unavailableMediaSummary = await purgeUnavailableMlsMedia();
  const purgeSummary = await purgeOrphanedMlsMediaFiles();
  const prunedEmptyDirectories = await pruneEmptyMlsMediaDirectories();
  syncMlsLogger.info('MLS orphaned media file cleanup completed', {
    trigger,
    softDeletedMediaSummary,
    unavailableMediaSummary,
    purgeSummary,
    prunedEmptyDirectories,
  });
}

async function runScheduledMediaSyncAndCleanup(
  scheduleId: string,
  input: {
    mediaSyncBatchSize: number;
    mediaSyncMaxBatches: number;
    mediaSyncProcessConcurrency: number;
    mediaSyncIncludeMissingFilesRepair: boolean;
    mediaSyncRepairMaxBatches: number;
  },
) {
  if (!(await isSeedCompleteFor(scheduleId))) return;
  const mediaQueueRefresh = await refreshMlsMediaQueue({
    originatingSystemName: env.MLS_ORIGINATING_SYSTEM_NAME,
    memberKeys: (env.MLS_MEMBER_ID ?? []).filter((key) => key.length > 0),
    officeKeys: (env.MLS_OFFICE_ID ?? []).filter((key) => key.length > 0),
  });
  const mediaSummary = await runScheduledMediaPhases(input, {
    associationMode: 'stale-or-unprocessed',
    includeMissingFilesRepair: false,
    repairMaxBatches: 1,
  });

  const deadMlsMediaPurgeSummary = await purgeDeadMlsMedia();
  const prunedEmptyDirectories = await pruneEmptyMlsMediaDirectories();

  syncMlsLogger.info('scheduled MLS media sync + dead media purge completed', {
    scheduleId,
    postSyncCleanup: mediaSummary.postSyncCleanup,
    postSyncNamespacePrune: mediaSummary.postSyncNamespacePrune,
    property: mediaSummary.property,
    propertyConfiguredAssociations: mediaSummary.propertyConfiguredAssociations,
    memberTargets: mediaSummary.memberKeys.length,
    member: mediaSummary.member,
    officeTargets: mediaSummary.officeKeys.length,
    office: mediaSummary.office,
    mediaQueueRefresh,
    deadMlsMediaPurgeSummary,
    prunedEmptyDirectories,
  });
}

async function runScheduledMediaReconcile(
  scheduleId: string,
  input: {
    mediaSyncBatchSize: number;
    mediaSyncMaxBatches: number;
    mediaSyncProcessConcurrency: number;
    mediaSyncIncludeMissingFilesRepair: boolean;
    mediaSyncRepairMaxBatches: number;
  },
) {
  if (!(await isSeedCompleteFor(scheduleId))) return;
  const mediaSummary = await runScheduledMediaPhases(input, {
    associationMode: 'stale-only',
    includeMissingFilesRepair: input.mediaSyncIncludeMissingFilesRepair,
    repairMaxBatches: input.mediaSyncRepairMaxBatches,
  });

  syncMlsLogger.info('scheduled MLS media reconcile completed', {
    scheduleId,
    postSyncCleanup: mediaSummary.postSyncCleanup,
    postSyncNamespacePrune: mediaSummary.postSyncNamespacePrune,
    property: mediaSummary.property,
    propertyConfiguredAssociations: mediaSummary.propertyConfiguredAssociations,
    memberTargets: mediaSummary.memberKeys.length,
    member: mediaSummary.member,
    officeTargets: mediaSummary.officeKeys.length,
    office: mediaSummary.office,
  });
}

async function runScheduledMediaPhases(
  input: {
    mediaSyncBatchSize: number;
    mediaSyncMaxBatches: number;
    mediaSyncProcessConcurrency: number;
    mediaSyncIncludeMissingFilesRepair: boolean;
    mediaSyncRepairMaxBatches: number;
  },
  options: {
    associationMode: 'stale-or-unprocessed' | 'unprocessed-only' | 'stale-only';
    includeMissingFilesRepair: boolean;
    repairMaxBatches: number;
  },
) {
  const memberKeys = (env.MLS_MEMBER_ID ?? []).filter((key) => key.length > 0);
  const officeKeys = (env.MLS_OFFICE_ID ?? []).filter((key) => key.length > 0);

  const prioritized = await runPrioritizedMlsMediaSync({
    batchSize: input.mediaSyncBatchSize,
    maxBatches: input.mediaSyncMaxBatches,
    processConcurrency: input.mediaSyncProcessConcurrency,
    associationMode: options.associationMode,
    includeMissingFilesRepair: options.includeMissingFilesRepair,
    repairMaxBatches: options.repairMaxBatches,
    memberKeys,
    officeKeys,
  });
  const propertySummary = prioritized.listings;
  const configuredAssociationPropertySummary = {
    office: prioritized.officeListings,
    members: prioritized.memberListings,
  };
  const memberSummary = prioritized.member;
  const officeSummary = prioritized.office;

  const postSyncCleanup = await purgeScopedMlsMediaBeforeSync({
    memberKeys,
    officeKeys,
  });
  const postSyncNamespacePrune = await pruneMlsMediaNamespacesWithoutLinkedMedia(undefined, {
    memberKeys,
    officeKeys,
  });

  return {
    postSyncCleanup,
    postSyncNamespacePrune,
    property: propertySummary,
    propertyConfiguredAssociations: configuredAssociationPropertySummary,
    member: memberSummary,
    office: officeSummary,
    memberKeys,
    officeKeys,
  };
}

function resolveMlsCleanupSchedule() {
  const enabled = true;
  const cronExpression = env.MLS_CLEANUP_CRON || '2 * * * *';

  return {
    scheduleId: MLS_CLEANUP_HOURLY_SCHEDULE_ID,
    cronExpression,
    cleanupFunction: runMlsCleanup,
    enabled,
  };
}

function resolveMlsMediaSyncSchedule() {
  const enabled = true;
  const cronExpression = env.MLS_MEDIA_SYNC_CRON || '*/15 * * * *';

  return {
    scheduleId: MLS_MEDIA_SYNC_SCHEDULE_ID,
    cronExpression,
    enabled,
  };
}

function resolveMlsMediaReconcileSchedule() {
  const enabled = true;
  const cronExpression = env.MLS_MEDIA_RECONCILE_CRON || '0 * * * *';

  return {
    scheduleId: MLS_MEDIA_RECONCILE_SCHEDULE_ID,
    cronExpression,
    enabled,
  };
}

function resolveScheduledMediaSyncBatchSize() {
  return Math.max(1, MLS_SCHEDULER_DEFAULTS.mediaSyncBatchSize);
}

function resolveScheduledMediaSyncMaxBatches() {
  return Math.max(1, env.MLS_MEDIA_SYNC_MAX_BATCHES ?? MLS_SCHEDULER_DEFAULTS.mediaSyncMaxBatches);
}

function resolveScheduledMediaSyncProcessConcurrency() {
  return Math.max(
    1,
    env.MLS_MEDIA_SYNC_PROCESS_CONCURRENCY ?? MLS_SCHEDULER_DEFAULTS.mediaSyncProcessConcurrency,
  );
}

function resolveScheduledMediaSyncIncludeMissingFilesRepair() {
  return MLS_SCHEDULER_DEFAULTS.mediaSyncIncludeMissingFilesRepair;
}

function resolveScheduledMediaSyncRepairMaxBatches(maxBatches: number) {
  return Math.max(1, Math.min(MLS_SCHEDULER_DEFAULTS.mediaSyncRepairMaxBatches, maxBatches));
}

export async function registerMlsSyncJobTypes() {
  for (const job of registeredMlsCronJobs) {
    job.stop();
  }
  registeredMlsCronJobs.length = 0;

  await runScheduledJob(MLS_MEDIA_ORPHAN_CLEANUP_SCHEDULE_ID, () =>
    runOrphanedMediaCleanup('startup'),
  );

  const scheduleEntries = resolveMlsDeltaResourceSchedules();
  const cleanupSchedule = resolveMlsCleanupSchedule();
  const mediaSyncSchedule = resolveMlsMediaSyncSchedule();
  const mediaReconcileSchedule = resolveMlsMediaReconcileSchedule();
  const mediaOrphanCleanupCronExpression = '0 */6 * * *';
  const historyPruneCronExpression = '0 3 * * *';
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
      const summary = await cleanupSchedule.cleanupFunction();
      syncMlsLogger.info('scheduled MLS data cleanup completed', { summary });
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
      await runScheduledMediaSyncAndCleanup(mediaSyncSchedule.scheduleId, {
        mediaSyncBatchSize,
        mediaSyncMaxBatches,
        mediaSyncProcessConcurrency,
        mediaSyncIncludeMissingFilesRepair,
        mediaSyncRepairMaxBatches,
      });
    });
  });
  registeredMlsCronJobs.push(mediaSyncJob);

  const mediaReconcileJob = Bun.cron(mediaReconcileSchedule.cronExpression, async () => {
    if (!mediaReconcileSchedule.enabled) {
      syncMlsLogger.debug('skipping disabled media reconcile schedule', {
        scheduleId: mediaReconcileSchedule.scheduleId,
      });
      return;
    }

    await runScheduledJob(mediaReconcileSchedule.scheduleId, async () => {
      await runScheduledMediaReconcile(mediaReconcileSchedule.scheduleId, {
        mediaSyncBatchSize,
        mediaSyncMaxBatches,
        mediaSyncProcessConcurrency,
        mediaSyncIncludeMissingFilesRepair,
        mediaSyncRepairMaxBatches,
      });
    });
  });
  registeredMlsCronJobs.push(mediaReconcileJob);

  const mediaOrphanCleanupJob = Bun.cron(mediaOrphanCleanupCronExpression, async () => {
    await runScheduledJob(MLS_MEDIA_ORPHAN_CLEANUP_SCHEDULE_ID, async () => {
      await runOrphanedMediaCleanup('scheduled');
    });
  });
  registeredMlsCronJobs.push(mediaOrphanCleanupJob);

  const historyPruneJob = Bun.cron(historyPruneCronExpression, async () => {
    await runScheduledJob(MLS_HISTORY_PRUNE_SCHEDULE_ID, async () => {
      const summary = await pruneExpiredHistory();
      syncMlsLogger.info('scheduled MLS history retention completed', { summary });
    });
  });
  registeredMlsCronJobs.push(historyPruneJob);

  if (mediaSyncSchedule.enabled) {
    void runScheduledJob(mediaSyncSchedule.scheduleId, async () => {
      await runScheduledMediaSyncAndCleanup(mediaSyncSchedule.scheduleId, {
        mediaSyncBatchSize,
        mediaSyncMaxBatches,
        mediaSyncProcessConcurrency,
        mediaSyncIncludeMissingFilesRepair,
        mediaSyncRepairMaxBatches,
      });
    });
  }

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
      maxConcurrentScheduledJobs: resolveMaxConcurrentScheduledJobs(),
      batchSize: mediaSyncBatchSize,
      maxBatches: mediaSyncMaxBatches,
      processConcurrency: mediaSyncProcessConcurrency,
      includeMissingFilesRepair: mediaSyncIncludeMissingFilesRepair,
      repairMaxBatches: mediaSyncRepairMaxBatches,
      prioritizedMemberKeysCount: (env.MLS_MEMBER_ID ?? []).length,
      prioritizedOfficeKeysCount: (env.MLS_OFFICE_ID ?? []).length,
    },
    mediaReconcileSchedule: {
      scheduleId: mediaReconcileSchedule.scheduleId,
      cronExpression: mediaReconcileSchedule.cronExpression,
      enabled: mediaReconcileSchedule.enabled,
      batchSize: mediaSyncBatchSize,
      maxBatches: mediaSyncMaxBatches,
      processConcurrency: mediaSyncProcessConcurrency,
      includeMissingFilesRepair: mediaSyncIncludeMissingFilesRepair,
      repairMaxBatches: mediaSyncRepairMaxBatches,
    },
    mediaOrphanCleanupSchedule: {
      scheduleId: MLS_MEDIA_ORPHAN_CLEANUP_SCHEDULE_ID,
      cronExpression: mediaOrphanCleanupCronExpression,
      enabled: true,
    },
    historyPruneSchedule: {
      scheduleId: MLS_HISTORY_PRUNE_SCHEDULE_ID,
      cronExpression: historyPruneCronExpression,
      enabled: true,
    },
  });
}
