const INITIAL_PROPERTY_TYPES = new Set(['Residential', 'ResidentialIncome', 'ResidentialLease']);
import { env } from '@kws/config/env';
import { startOfYear } from 'date-fns';

// ---------------------------------------------------------------------------
// MLS sync orchestrator
// ---------------------------------------------------------------------------
// Runs resources in dependency order: Lookup → Office → Member → Property → OpenHouse
// Exposes runFullSync (initial-capable) and runDeltaSync (delta-only).
// ---------------------------------------------------------------------------
import { MLS_PROPERTY_DEFAULTS, MLS_RESOURCE_NAMES } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { createRunId } from '@/lib/run-id';
import {
  fetchLookups,
  fetchMembers,
  fetchOffices,
  fetchOpenHouses,
  fetchPropertiesForInitialSeed,
  fetchResidentialProperties,
} from '@/lib/utils/fetch';
import { mapLookup } from '@/maps/lookup.mapper';
import { mapMember } from '@/maps/member.mapper';
import { mapOffice } from '@/maps/office.mapper';
import { mapOpenHouse } from '@/maps/open-house.mapper';
import { mapProperty } from '@/maps/property.mapper';

import type {
  MlsPropertyPayload,
  MlsResource,
  ODataPageBatch,
  SyncResult,
  SyncSummary,
} from '../types';

import { getLatestLookupTimestamp, upsertLookups } from '../repositories/lookup.repository';
import {
  pruneMlsMediaNamespacesWithoutLinkedMedia,
  purgeScopedMlsMediaBeforeSync,
} from '../repositories/media-cleanup.repository';
import {
  getLatestMemberTimestamp,
  processMlsMembersPayload,
} from '../repositories/member.repository';
import {
  getLatestOfficeTimestamp,
  processMlsOfficesPayload,
} from '../repositories/office.repository';
import {
  getLatestOpenHouseTimestamp,
  upsertOpenHouses,
} from '../repositories/open-house.repository';
import {
  getLatestPropertyTimestamp,
  processMlsPropertiesPayload,
} from '../repositories/property.repository';
import { runPrioritizedMlsMediaSync, type MlsMediaSyncSummary } from './seed-media';
import { seedResource } from './seed-resource';
import { syncResource } from './sync-resource';

// ---------------------------------------------------------------------------
// Media seed phase adapter
// ---------------------------------------------------------------------------

function mediaSummaryToSyncResult(
  resource: string,
  osn: string,
  summary: MlsMediaSyncSummary,
  startedAt: Date,
): SyncResult {
  return {
    resource,
    osn,
    upserted: summary.processed,
    errors: summary.failed,
    durationMs: Date.now() - startedAt.getTime(),
  };
}

// ---------------------------------------------------------------------------
// Wired-up seed configs per resource
// ---------------------------------------------------------------------------

function lookupSeedConfig(osn: string) {
  return seedResource({
    resource: 'Lookup',
    osn,
    fetchFn: fetchLookups,
    getLatestTimestamp: getLatestLookupTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    getKey: (record) => record.LookupKey,
    upsert: async (payload) => upsertLookups(payload.map(mapLookup)),
  });
}

function officeSeedConfig(osn: string) {
  return seedResource({
    resource: 'Office',
    osn,
    fetchFn: fetchOffices,
    getLatestTimestamp: getLatestOfficeTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    getKey: (record) => record.OfficeMlsId,
    upsert: async (payload) => processMlsOfficesPayload(payload.map(mapOffice)),
  });
}

function memberSeedConfig(osn: string) {
  return seedResource({
    resource: 'Member',
    osn,
    fetchFn: fetchMembers,
    getLatestTimestamp: getLatestMemberTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    getKey: (record) => record.MemberMlsId,
    upsert: async (payload) => processMlsMembersPayload(payload.map(mapMember)),
  });
}

function propertySeedConfig(osn: string) {
  const baseStart = env.MLS_START_DATE ?? startOfYear(Date.now());
  const officeScope = new Set((env.MLS_OFFICE_ID ?? []).map((id) => id.trim()).filter(Boolean));
  const memberScope = new Set((env.MLS_MEMBER_ID ?? []).map((id) => id.trim()).filter(Boolean));
  const activeStatuses = new Set(['Active', 'ActiveUnderContract', 'ComingSoon']);

  const shouldRetainProperty = (record: MlsPropertyPayload): boolean => {
    const normalizedStatus = record.StandardStatus?.replace(/\s+/g, '');
    const isViewable = record.MlgCanView === true;

    const officeCandidates = [record.ListOfficeMlsId, record.CoListOfficeMlsId]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
    const memberCandidates = [record.ListAgentMlsId, record.CoListAgentMlsId]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    const inConfiguredScope =
      officeCandidates.some((candidate) => officeScope.has(candidate)) ||
      memberCandidates.some((candidate) => memberScope.has(candidate));

    if (inConfiguredScope) {
      return true;
    }

    return (
      isViewable &&
      normalizedStatus !== undefined &&
      activeStatuses.has(normalizedStatus) &&
      INITIAL_PROPERTY_TYPES.has(record.PropertyType?.replace(/\s+/g, '') ?? '')
    );
  };

  return seedResource({
    resource: 'Property',
    osn,
    afterTimestamp: baseStart,
    beforeTimestamp: undefined,
    startUrl: undefined,
    replayBatchSize: MLS_PROPERTY_DEFAULTS.replayBatchSize,
    fetchFn: fetchPropertiesForInitialSeed,
    getLatestTimestamp: getLatestPropertyTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    getKey: (record) => record.ListingKey,
    filterRecord: shouldRetainProperty,
    upsert: async (payload) =>
      processMlsPropertiesPayload(payload.map(mapProperty), {
        useSeedStaging: MLS_PROPERTY_DEFAULTS.seedUseStaging,
      }),
  });
}

function openHouseSeedConfig(osn: string) {
  return seedResource({
    resource: 'OpenHouse',
    osn,
    fetchFn: fetchOpenHouses,
    getLatestTimestamp: getLatestOpenHouseTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    getKey: (record) => record.OpenHouseKey,
    upsert: async (payload) => upsertOpenHouses(payload.map(mapOpenHouse)),
  });
}

function lookupConfig(osn: string) {
  return syncResource({
    resource: 'Lookup',
    osn,
    fetchFn: fetchLookups,
    getLatestTimestamp: getLatestLookupTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    upsert: async (payload) => upsertLookups(payload.map(mapLookup)),
  });
}

function officeConfig(osn: string) {
  return syncResource({
    resource: 'Office',
    osn,
    fetchFn: fetchOffices,
    getLatestTimestamp: getLatestOfficeTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    upsert: async (payload) => processMlsOfficesPayload(payload.map(mapOffice)),
  });
}

function memberConfig(osn: string) {
  return syncResource({
    resource: 'Member',
    osn,
    fetchFn: fetchMembers,
    getLatestTimestamp: getLatestMemberTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    upsert: async (payload) => processMlsMembersPayload(payload.map(mapMember)),
  });
}

function propertyConfig(
  osn: string,
  fetchFn: (
    osn: string,
    options?: {
      afterTimestamp?: Date;
      beforeTimestamp?: Date;
      startUrl?: string;
    },
  ) => AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> = fetchResidentialProperties,
) {
  return syncResource({
    resource: 'Property',
    osn,
    fetchFn,
    getLatestTimestamp: getLatestPropertyTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    upsert: async (payload) =>
      processMlsPropertiesPayload(
        payload
          .filter(
            (record) =>
              record.MlgCanView === false ||
              INITIAL_PROPERTY_TYPES.has(record.PropertyType?.replace(/\s+/g, '') ?? '') ||
              [record.ListOfficeMlsId, record.CoListOfficeMlsId].some(
                (key) => key && env.MLS_OFFICE_ID?.includes(key),
              ) ||
              [record.ListAgentMlsId, record.CoListAgentMlsId].some(
                (key) => key && env.MLS_MEMBER_ID?.includes(key),
              ),
          )
          .map(mapProperty),
      ),
  });
}

function openHouseConfig(osn: string) {
  return syncResource({
    resource: 'OpenHouse',
    osn,
    fetchFn: fetchOpenHouses,
    getLatestTimestamp: getLatestOpenHouseTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    upsert: async (payload) => upsertOpenHouses(payload.map(mapOpenHouse)),
  });
}

function getResourceRunner(resource: MlsResource, osn: string) {
  if (resource === 'Lookup') return lookupConfig(osn);
  if (resource === 'Property') return propertyConfig(osn);
  if (resource === 'Office') return officeConfig(osn);
  if (resource === 'Member') return memberConfig(osn);
  return openHouseConfig(osn);
}

function timed<T>(
  stageTimingsMs: Record<string, number>,
  stage: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  return run().then((result) => {
    stageTimingsMs[stage] = Date.now() - startedAt;
    return result;
  });
}

async function runResourceSequence(
  osn: string,
  mode: 'initial' | 'delta',
  runIdPrefix: string,
  stages: ReadonlyArray<readonly [string, () => Promise<SyncResult>]>,
): Promise<SyncSummary> {
  const startedAt = new Date();
  const runId = createRunId(runIdPrefix);
  logger.info(`${mode} sync started`, { osn, runId });

  const stageTimingsMs: Record<string, number> = {};
  const results: SyncResult[] = [];
  for (const [stage, runStage] of stages) {
    results.push(await timed(stageTimingsMs, stage, runStage));
  }

  const completedAt = new Date();
  const summary: SyncSummary = {
    runId,
    osn,
    mode,
    results,
    stageTimingsMs,
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
  };

  logger.info(`${mode} sync finished`, {
    osn,
    totalDurationMs: summary.totalDurationMs,
  });

  return summary;
}

function getSeedStages(osn: string): ReadonlyArray<readonly [string, () => Promise<SyncResult>]> {
  return [
    ['Lookup', () => lookupSeedConfig(osn)],
    ['Office', () => officeSeedConfig(osn)],
    ['Member', () => memberSeedConfig(osn)],
    ['Property', () => propertySeedConfig(osn)],
    ['OpenHouse', () => openHouseSeedConfig(osn)],
  ];
}

function getDeltaStages(osn: string): ReadonlyArray<readonly [string, () => Promise<SyncResult>]> {
  return [
    ['Lookup', () => lookupConfig(osn)],
    ['Office', () => officeConfig(osn)],
    ['Member', () => memberConfig(osn)],
    ['Property', () => propertyConfig(osn, fetchResidentialProperties)],
    ['OpenHouse', () => openHouseConfig(osn)],
  ];
}

export async function runDeltaSyncResource(
  resource: MlsResource,
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  const startedAt = new Date();
  const runId = createRunId(`delta-${resource.toLowerCase()}`);
  logger.info('delta resource sync started', { resource, osn, runId });

  const result = await getResourceRunner(resource, osn);
  const completedAt = new Date();

  const summary: SyncSummary = {
    runId,
    osn,
    mode: 'delta',
    results: [result],
    stageTimingsMs: {
      [resource]: completedAt.getTime() - startedAt.getTime(),
    },
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
  };

  logger.info('delta resource sync finished', {
    resource,
    osn,
    totalDurationMs: summary.totalDurationMs,
    errors: result.errors,
    error: result.error,
  });

  return summary;
}

async function runSeedInitialMedia(osn: string): Promise<SyncSummary> {
  const startedAt = new Date();
  logger.info(`initial media sync started`, { osn });

  const configuredMemberKeys = (env.MLS_MEMBER_ID ?? []).filter((key) => key.length > 0);
  const configuredOfficeKeys = (env.MLS_OFFICE_ID ?? []).filter((key) => key.length > 0);

  const prioritized = await runPrioritizedMlsMediaSync({
    maxBatches: Number.MAX_SAFE_INTEGER,
    associationMode: 'stale-or-unprocessed',
    memberKeys: configuredMemberKeys,
    officeKeys: configuredOfficeKeys,
  });
  const phaseSummaries = [
    ['Office:Media', prioritized.office],
    ['Property:ConfiguredOffice:Media', prioritized.officeListings],
    ['Member:Media', prioritized.member],
    ['Property:ConfiguredMembers:Media', prioritized.memberListings],
    ['Property:Media', prioritized.listings],
  ] as const;
  const results: SyncResult[] = phaseSummaries.flatMap(([phase, summary]) =>
    summary ? [mediaSummaryToSyncResult(phase, osn, summary, startedAt)] : [],
  );
  logger.info('initial media phases completed', {
    osn,
    budgetExhausted: prioritized.budgetExhausted,
    phases: results.map((result) => ({
      resource: result.resource,
      upserted: result.upserted,
      errors: result.errors,
    })),
  });

  const postSyncCleanup = await purgeScopedMlsMediaBeforeSync({
    memberKeys: configuredMemberKeys,
    officeKeys: configuredOfficeKeys,
  });
  const postSyncNamespacePrune = await pruneMlsMediaNamespacesWithoutLinkedMedia(undefined, {
    memberKeys: configuredMemberKeys,
    officeKeys: configuredOfficeKeys,
  });

  logger.info('initial media post-sync cleanup completed', {
    osn,
    postSyncCleanup,
    postSyncNamespacePrune,
  });

  const completedAt = new Date();
  const summary: SyncSummary = {
    osn,
    mode: 'initial',
    results,
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
  };

  logger.info(`initial sync finished`, {
    osn,
    totalDurationMs: summary.totalDurationMs,
  });

  return summary;
}

// ---------------------------------------------------------------------------
// Public orchestration functions
// ---------------------------------------------------------------------------

export async function runInitialDataSeed(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runResourceSequence(osn, 'initial', 'initial-seed', getSeedStages(osn));
}

export async function runDeltaSync(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runResourceSequence(osn, 'delta', 'delta-sync', getDeltaStages(osn));
}

export async function runInitialMediaSeed(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runSeedInitialMedia(osn);
}

const RESOURCE_LABELS = new Set<string>(MLS_RESOURCE_NAMES);

export function isMlsDeltaResourceName(value: string): value is MlsResource {
  return RESOURCE_LABELS.has(value);
}
