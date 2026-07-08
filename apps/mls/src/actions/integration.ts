import { env } from '@kws/config';

import type { MlsResource } from '@/types';

import { MLS_RESOURCE_NAMES, MLS_SCHEDULER_DEFAULTS } from '@/lib/constants';
import { mlsLogger } from '@/lib/logger';

import {
  pruneEmptyMlsMediaDirectories,
  purgeDeadMlsMedia,
} from '../repositories/media-cleanup.repository';
import { runMlsCleanup } from './cleanup';
import { isMlsDeltaResourceName, runDeltaSyncResource } from './orchestrator';
import { runMlsMediaSync } from './seed-media';

const MLS_CLEANUP_HOURLY_SCHEDULE_ID = 'mls.cleanup.hourly';
const MLS_MEDIA_SYNC_SCHEDULE_ID = 'mls.media.sync';
const MLS_MEDIA_RECONCILE_SCHEDULE_ID = 'mls.media.reconcile';

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
  const mediaSummary = await runScheduledMediaPhases(input, {
    associationMode: 'unprocessed-only',
    includeMissingFilesRepair: false,
    repairMaxBatches: 1,
  });

  const deadMlsMediaPurgeSummary = await purgeDeadMlsMedia();
  const prunedEmptyDirectories = await pruneEmptyMlsMediaDirectories();

  syncMlsLogger.info('scheduled MLS media sync + dead media purge completed', {
    scheduleId,
    property: mediaSummary.property,
    propertyConfiguredAssociations: mediaSummary.propertyConfiguredAssociations,
    memberTargets: mediaSummary.memberKeys.length,
    member: mediaSummary.member,
    officeTargets: mediaSummary.officeKeys.length,
    office: mediaSummary.office,
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
  const mediaSummary = await runScheduledMediaPhases(input, {
    associationMode: 'stale-only',
    includeMissingFilesRepair: input.mediaSyncIncludeMissingFilesRepair,
    repairMaxBatches: input.mediaSyncRepairMaxBatches,
  });

  syncMlsLogger.info('scheduled MLS media reconcile completed', {
    scheduleId,
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
    associationMode: 'unprocessed-only' | 'stale-only';
    includeMissingFilesRepair: boolean;
    repairMaxBatches: number;
  },
) {
  const memberKeys = (env.MLS_MEMBER_ID ?? []).filter((key) => key.length > 0);
  const officeKeys = (env.MLS_OFFICE_ID ?? []).filter((key) => key.length > 0);

  const propertySummary = await runMlsMediaSync({
    batchSize: input.mediaSyncBatchSize,
    maxBatches: input.mediaSyncMaxBatches,
    processConcurrency: input.mediaSyncProcessConcurrency,
    prioritizeMemberKeys: memberKeys,
    prioritizeOfficeKeys: officeKeys,
    primaryOnlyForAllProperties: true,
    filterEntityTypes: ['properties'],
    associationMode: options.associationMode,
    includeMissingFilesRepair: options.includeMissingFilesRepair,
    repairMaxBatches: options.repairMaxBatches,
    enforceEligibilityForNonAssociatedProperties: true,
  });

  let configuredAssociationPropertySummary: Awaited<ReturnType<typeof runMlsMediaSync>> | undefined;
  if (memberKeys.length > 0 || officeKeys.length > 0) {
    configuredAssociationPropertySummary = await runMlsMediaSync({
      batchSize: input.mediaSyncBatchSize,
      maxBatches: input.mediaSyncMaxBatches,
      processConcurrency: input.mediaSyncProcessConcurrency,
      filterEntityTypes: ['properties'],
      associationMode: options.associationMode,
      includeMissingFilesRepair: options.includeMissingFilesRepair,
      repairMaxBatches: options.repairMaxBatches,
      restrictToMemberPropertyKeys: memberKeys,
      restrictToOfficePropertyKeys: officeKeys,
    });
  }

  let memberSummary: Awaited<ReturnType<typeof runMlsMediaSync>> | undefined;
  if (memberKeys.length > 0) {
    memberSummary = await runMlsMediaSync({
      batchSize: input.mediaSyncBatchSize,
      maxBatches: input.mediaSyncMaxBatches,
      processConcurrency: input.mediaSyncProcessConcurrency,
      filterEntityTypes: ['members'],
      associationMode: options.associationMode,
      includeMissingFilesRepair: options.includeMissingFilesRepair,
      repairMaxBatches: options.repairMaxBatches,
      restrictToMemberEntityKeys: memberKeys,
    });
  }

  let officeSummary: Awaited<ReturnType<typeof runMlsMediaSync>> | undefined;
  if (officeKeys.length > 0) {
    officeSummary = await runMlsMediaSync({
      batchSize: input.mediaSyncBatchSize,
      maxBatches: input.mediaSyncMaxBatches,
      processConcurrency: input.mediaSyncProcessConcurrency,
      filterEntityTypes: ['offices'],
      associationMode: options.associationMode,
      includeMissingFilesRepair: options.includeMissingFilesRepair,
      repairMaxBatches: options.repairMaxBatches,
      restrictToOfficeEntityKeys: officeKeys,
    });
  }

  return {
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
  const cronExpression = env.MLS_MEDIA_RECONCILE_CRON || '0 */6 * * *';

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
  return Math.max(1, MLS_SCHEDULER_DEFAULTS.mediaSyncMaxBatches);
}

function resolveScheduledMediaSyncProcessConcurrency() {
  return Math.max(1, MLS_SCHEDULER_DEFAULTS.mediaSyncProcessConcurrency);
}

function resolveScheduledMediaSyncIncludeMissingFilesRepair() {
  return MLS_SCHEDULER_DEFAULTS.mediaSyncIncludeMissingFilesRepair;
}

function resolveScheduledMediaSyncRepairMaxBatches(maxBatches: number) {
  return Math.max(1, Math.min(MLS_SCHEDULER_DEFAULTS.mediaSyncRepairMaxBatches, maxBatches));
}

export function registerMlsSyncJobTypes() {
  for (const job of registeredMlsCronJobs) {
    job.stop();
  }
  registeredMlsCronJobs.length = 0;

  const scheduleEntries = resolveMlsDeltaResourceSchedules();
  const cleanupSchedule = resolveMlsCleanupSchedule();
  const mediaSyncSchedule = resolveMlsMediaSyncSchedule();
  const mediaReconcileSchedule = resolveMlsMediaReconcileSchedule();
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
  });
}
