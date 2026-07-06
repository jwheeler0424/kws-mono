import { env } from '@kws/config/env';
import { startOfYear } from 'date-fns';

// ---------------------------------------------------------------------------
// MLS sync orchestrator
// ---------------------------------------------------------------------------
// Runs resources in dependency order: Lookup → Office → Member → Property → OpenHouse
// Exposes runFullSync (initial-capable) and runDeltaSync (delta-only).
// ---------------------------------------------------------------------------
import { MLS_RESOURCE_NAMES } from '@/lib/constants';
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
import { runInitialMlsMediaSync, type MlsMediaSyncSummary } from './seed-media';
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

  return seedResource({
    resource: 'Property',
    osn,
    afterTimestamp: baseStart,
    beforeTimestamp: undefined,
    startUrl: undefined,
    fetchFn: fetchPropertiesForInitialSeed,
    getLatestTimestamp: getLatestPropertyTimestamp,
    getTimestamp: (record) => record.ModificationTimestamp,
    getKey: (record) => record.ListingKey,
    upsert: async (payload) =>
      processMlsPropertiesPayload(payload.map(mapProperty), {
        useSeedStaging: env.MLS_PROPERTY_SEED_USE_STAGING ?? false,
      }),
  });
}

async function propertyMediaSeedConfig(osn: string): Promise<SyncResult> {
  const startedAt = new Date();
  return runInitialMlsMediaSync({
    filterEntityTypes: ['properties'],
    primaryOnlyForAllProperties: true,
    associationMode: 'unprocessed-only',
    includeMissingFilesRepair: false,
  }).then((summary) => mediaSummaryToSyncResult('Property:PrimaryMedia', osn, summary, startedAt));
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
    upsert: async (payload) => processMlsPropertiesPayload(payload.map(mapProperty)),
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

async function runSeedAllResources(osn: string, mode: 'initial' | 'delta'): Promise<SyncSummary> {
  const startedAt = new Date();
  const runId = createRunId(`${mode}-seed`);
  logger.info(`${mode} sync started`, { osn, runId });

  // Resources run sequentially in dependency order
  const stageTimingsMs: Record<string, number> = {};
  const results: SyncResult[] = [];
  results.push(await timed(stageTimingsMs, 'Lookup', () => lookupSeedConfig(osn)));
  results.push(await timed(stageTimingsMs, 'Office', () => officeSeedConfig(osn)));
  results.push(await timed(stageTimingsMs, 'Member', () => memberSeedConfig(osn)));
  results.push(await timed(stageTimingsMs, 'Property', () => propertySeedConfig(osn)));
  results.push(await timed(stageTimingsMs, 'OpenHouse', () => openHouseSeedConfig(osn)));

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

async function runAllResources(osn: string, mode: 'initial' | 'delta'): Promise<SyncSummary> {
  const startedAt = new Date();
  const runId = createRunId(`${mode}-sync`);
  logger.info(`${mode} sync started`, { osn, runId });

  // Resources run sequentially in dependency order
  const stageTimingsMs: Record<string, number> = {};
  const results: SyncResult[] = [];
  if (mode === 'initial') {
    results.push(await timed(stageTimingsMs, 'Lookup', () => lookupSeedConfig(osn)));
    results.push(await timed(stageTimingsMs, 'Office', () => officeSeedConfig(osn)));
    results.push(await timed(stageTimingsMs, 'Member', () => memberSeedConfig(osn)));
    results.push(await timed(stageTimingsMs, 'Property', () => propertySeedConfig(osn)));
    results.push(await timed(stageTimingsMs, 'OpenHouse', () => openHouseSeedConfig(osn)));
  } else {
    results.push(await timed(stageTimingsMs, 'Lookup', () => lookupConfig(osn)));
    results.push(await timed(stageTimingsMs, 'Office', () => officeConfig(osn)));
    results.push(await timed(stageTimingsMs, 'Member', () => memberConfig(osn)));
    results.push(
      await timed(stageTimingsMs, 'Property', () =>
        propertyConfig(osn, fetchResidentialProperties),
      ),
    );
    results.push(await timed(stageTimingsMs, 'OpenHouse', () => openHouseConfig(osn)));
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

async function runSeedInitialMedia(osn: string, mode: 'initial' | 'delta'): Promise<SyncSummary> {
  const startedAt = new Date();
  logger.info(`initial media sync started`, { osn });

  const runMediaPhase = async (
    phase: 'Property:MemberMedia' | 'Office:Media' | 'Member:Media' | 'Property:Media',
    fn: () => Promise<SyncResult>,
  ): Promise<SyncResult> => {
    const phaseStartedAt = Date.now();
    logger.info('initial media phase started', {
      osn,
      phase,
    });

    const result = await fn();

    logger.info('initial media phase completed', {
      osn,
      phase,
      durationMs: Date.now() - phaseStartedAt,
      upserted: result.upserted,
      errors: result.errors,
      resource: result.resource,
    });

    return result;
  };

  // Initial media seed is intentionally single-phase and property-primary-only:
  //   - Process only Property entity rows
  //   - Process only primary photos
  //   - Process only rows without a linked media association
  const results: SyncResult[] = [];
  results.push(await runMediaPhase('Property:PrimaryMedia', () => propertyMediaSeedConfig(osn)));

  const completedAt = new Date();
  const summary: SyncSummary = {
    osn,
    mode,
    results,
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

// ---------------------------------------------------------------------------
// Public orchestration functions
// ---------------------------------------------------------------------------

export async function runInitialDataSeed(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runSeedAllResources(osn, 'initial');
}

export async function runDeltaSync(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runAllResources(osn, 'delta');
}

export async function runInitialMediaSeed(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runSeedInitialMedia(osn, 'initial');
}

const RESOURCE_LABELS = new Set<string>(MLS_RESOURCE_NAMES);

export function isMlsDeltaResourceName(value: string): value is MlsResource {
  return RESOURCE_LABELS.has(value);
}
