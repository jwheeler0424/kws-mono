// ---------------------------------------------------------------------------
// MLS sync orchestrator
// ---------------------------------------------------------------------------
// Runs resources in dependency order: Lookup → Office → Member → Property → OpenHouse
// Exposes runFullSync (initial-capable) and runDeltaSync (delta-only).
// ---------------------------------------------------------------------------
import { MLS_RESOURCE_NAMES } from "@/lib/constants";
import { startOfYear } from 'date-fns';
import type { MlsPropertyPayload, MlsResource, ODataPageBatch, SyncResult, SyncSummary } from '../types';

import { logger } from '@/lib/logger';
import { fetchLookups, fetchMembers, fetchOffices, fetchOpenHouses, fetchPropertiesForInitialSeed, fetchResidentialProperties } from '@/lib/utils/fetch';
import { mapLookup } from '@/maps/lookup.mapper';
import { mapMember } from '@/maps/member.mapper';
import { mapOffice } from '@/maps/office.mapper';
import { mapOpenHouse } from '@/maps/open-house.mapper';
import { mapProperty } from '@/maps/property.mapper';
import { env } from '@kws/config/env';
import { upsertLookups } from '../repositories/lookup.repository';
import {
  processMlsMembersPayload
} from '../repositories/member.repository';
import {
  processMlsOfficesPayload
} from '../repositories/office.repository';
import {
  upsertOpenHouses
} from '../repositories/open-house.repository';
import {
  processMlsPropertiesPayload
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
    upsert: async (payload) => upsertLookups(payload.map(mapLookup))
  })
}

function officeSeedConfig(osn: string) {
  return seedResource({
    resource: 'Office',
    osn,
    fetchFn: fetchOffices,
    upsert: async (payload) => processMlsOfficesPayload(payload.map(mapOffice)),
  })
}

async function officeMediaSeedConfig(osn: string): Promise<SyncResult> {
  const startedAt = new Date();
  return runInitialMlsMediaSync({
    filterEntityTypes: ['offices'],
    includeMissingFilesRepair: true,
  }).then((summary) =>
    mediaSummaryToSyncResult('Office:Media', osn, summary, startedAt),
  );
}

function memberSeedConfig(osn: string) {
  return seedResource({
    resource: 'Member',
    osn,
    fetchFn: fetchMembers,
    upsert: async (payload) => processMlsMembersPayload(payload.map(mapMember)),
  })
}

async function memberMediaSeedConfig(osn: string): Promise<SyncResult> {
  const startedAt = new Date();
  return runInitialMlsMediaSync({
    filterEntityTypes: ['members'],
    includeMissingFilesRepair: true,
  }).then((summary) =>
    mediaSummaryToSyncResult('Member:Media', osn, summary, startedAt),
  );
}

function propertySeedConfig(
  osn: string,
) {
  const baseStart = env.MLS_START_DATE ?? startOfYear(Date.now());

  return seedResource({
    resource: 'Property',
    osn,
    afterTimestamp: baseStart,
    beforeTimestamp: undefined,
    startUrl: undefined,
    fetchFn: fetchPropertiesForInitialSeed,
    upsert: async (payload) => processMlsPropertiesPayload(payload.map(mapProperty)),
  })
}

async function propertyMediaSeedConfig(osn: string): Promise<SyncResult> {
  const startedAt = new Date();
  return runInitialMlsMediaSync({
    filterEntityTypes: ['properties'],
    primaryOnlyForNonPrioritizedProperties: true,
    associationMode: 'unprocessed-only',
    includeMissingFilesRepair: true,
  }).then((summary) => mediaSummaryToSyncResult('Property:Media', osn, summary, startedAt));
}

async function memberPropertyMediaSeedConfig(osn: string): Promise<SyncResult> {
  const startedAt = new Date();
  const memberKeys = env.MLS_MEMBER_ID ?? [];

  if (memberKeys.length === 0) {
    return Promise.resolve(
      mediaSummaryToSyncResult(
        'Property:MemberMedia',
        osn,
        {
          scanned: 0,
          processed: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          localSourceUsed: 0,
          remoteSourceUsed: 0,
          repairScanned: 0,
          repairProcessed: 0,
          repairSkippedHealthy: 0,
          repairFailed: 0,
        },
        startedAt,
      ),
    );
  }

  return runInitialMlsMediaSync({
    filterEntityTypes: ['properties'],
    restrictToMemberPropertyKeys: memberKeys,
    primaryOnlyForNonPrioritizedProperties: false,
    includeMissingFilesRepair: true,
  }).then((summary) => mediaSummaryToSyncResult('Property:MemberMedia', osn, summary, startedAt));
}

function openHouseSeedConfig(osn: string) {
  return seedResource({
    resource: 'OpenHouse',
    osn,
    fetchFn: fetchOpenHouses,
    upsert: async (payload) => upsertOpenHouses(payload.map(mapOpenHouse)),
  })
}

function lookupConfig(osn: string) {
  return syncResource({
    resource: 'Lookup',
    osn,
    fetchFn: fetchLookups,
    getKey: (r) => r.LookupKey,
    canView: (r) => r.MlgCanView !== false,
    getTimestamp: (r) => r.ModificationTimestamp,
    upsert: async (payload) => upsertLookups(payload.map(mapLookup))
  })
}

function officeConfig(osn: string) {
  return syncResource({
    resource: 'Office',
    osn,
    fetchFn: fetchOffices,
    getKey: (r) => r.OfficeMlsId,
    canView: (r) => r.MlgCanView !== false,
    getTimestamp: (r) => r.ModificationTimestamp,
    upsert: async (payload) => processMlsOfficesPayload(payload.map(mapOffice)),
  })
}

function memberConfig(osn: string) {
  return syncResource({
    resource: 'Member',
    osn,
    fetchFn: fetchMembers,
    getKey: (r) => r.MemberMlsId,
    canView: (r) => r.MlgCanView !== false,
    getTimestamp: (r) => r.ModificationTimestamp,
    upsert: async (payload) => processMlsMembersPayload(payload.map(mapMember)),
  })
}

function propertyConfig(
  osn: string,
  fetchFn: (
    osn: string,
    options?: {
      afterTimestamp?: Date
      beforeTimestamp?: Date;
      startUrl?: string
    },
  ) => AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> = fetchResidentialProperties,
) {
  return syncResource({
    resource: 'Property',
    osn,
    fetchFn,
    getKey: (r) => r.ListingKey,
    canView: (r) => r.MlgCanView !== false,
    getTimestamp: (r) => r.ModificationTimestamp,
    upsert: async (payload) => processMlsPropertiesPayload(payload.map(mapProperty)),
  })
}

function openHouseConfig(osn: string) {

  return syncResource({
    resource: 'OpenHouse',
    osn,
    fetchFn: fetchOpenHouses,
    getKey: (r) => r.OpenHouseKey,
    canView: (r) => r.MlgCanView !== false,
    getTimestamp: (r) => r.ModificationTimestamp,
    upsert: async (payload) => upsertOpenHouses(payload.map(mapOpenHouse)),
  })
}

function getResourceRunner(resource: MlsResource, osn: string) {
  if (resource === 'Lookup') return lookupConfig(osn)
  if (resource === 'Property') return propertyConfig(osn)
  if (resource === 'Office') return officeConfig(osn)
  if (resource === 'Member') return memberConfig(osn)
  return openHouseConfig(osn)
}

async function runSeedAllResources(osn: string, mode: 'initial' | 'delta'): Promise<SyncSummary> {
  const startedAt = new Date()
  logger.info(`${mode} sync started`, { osn })

  // Resources run sequentially in dependency order
  const results: SyncResult[] = []
  results.push(await lookupSeedConfig(osn))
  results.push(await officeSeedConfig(osn))
  results.push(await memberSeedConfig(osn))
  results.push(
    await propertySeedConfig(osn),
  )
  results.push(await openHouseSeedConfig(osn))

  const completedAt = new Date()
  const summary: SyncSummary = {
    osn,
    mode,
    results,
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
  }

  logger.info(`${mode} sync finished`, {
    osn,
    totalDurationMs: summary.totalDurationMs,
  })

  return summary
}

export async function runDeltaSyncResource(
  resource: MlsResource,
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  const startedAt = new Date()
  logger.info('delta resource sync started', { resource, osn })

  const result = await getResourceRunner(resource, osn)
  const completedAt = new Date()

  const summary: SyncSummary = {
    osn,
    mode: 'delta',
    results: [result],
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
  }

  logger.info('delta resource sync finished', {
    resource,
    osn,
    totalDurationMs: summary.totalDurationMs,
    errors: result.errors,
    error: result.error,
  })

  return summary
}

async function runAllResources(osn: string, mode: 'initial' | 'delta'): Promise<SyncSummary> {
  const startedAt = new Date()
  logger.info(`${mode} sync started`, { osn })

  // Resources run sequentially in dependency order
  const results: SyncResult[] = []
  if (mode === 'initial') {
    results.push(await lookupSeedConfig(osn))
    results.push(await officeSeedConfig(osn))
    results.push(await memberSeedConfig(osn))
    results.push(
      await propertySeedConfig(osn),
    )
    results.push(await openHouseSeedConfig(osn))
  } else {
    results.push(await lookupConfig(osn))
    results.push(await officeConfig(osn))
    results.push(await memberConfig(osn))
    results.push(
      await propertyConfig(osn, fetchResidentialProperties),
    )
    results.push(await openHouseConfig(osn))
  }

  const completedAt = new Date()
  const summary: SyncSummary = {
    osn,
    mode,
    results,
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
  }

  logger.info(`${mode} sync finished`, {
    osn,
    totalDurationMs: summary.totalDurationMs,
  })

  return summary
}

async function runSeedInitialMedia(osn: string, mode: 'initial' | 'delta'): Promise<SyncSummary> {
  const startedAt = new Date()
  logger.info(`initial media sync started`, { osn })

  // Phases run sequentially in priority order:
  //   1. Full media for properties listed by configured member IDs
  //   2. Office entity media (logos / photos)
  //   3. Member entity media (headshots)
  //   4. Primary image for all remaining active properties
  const results: SyncResult[] = []
  results.push(await memberPropertyMediaSeedConfig(osn))
  results.push(await officeMediaSeedConfig(osn))
  results.push(await memberMediaSeedConfig(osn))
  results.push(await propertyMediaSeedConfig(osn))

  const completedAt = new Date()
  const summary: SyncSummary = {
    osn,
    mode,
    results,
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
  }

  logger.info(`${mode} sync finished`, {
    osn,
    totalDurationMs: summary.totalDurationMs,
  })

  return summary
}

// ---------------------------------------------------------------------------
// Public orchestration functions
// ---------------------------------------------------------------------------

export async function runInitialDataSeed(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runSeedAllResources(osn, 'initial')
}

export async function runDeltaSync(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runAllResources(osn, 'delta')
}

export async function runInitialMediaSeed(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runSeedInitialMedia(osn, 'initial')
}

const RESOURCE_LABELS = new Set<string>(MLS_RESOURCE_NAMES)

export function isMlsDeltaResourceName(value: string): value is MlsResource {
  return RESOURCE_LABELS.has(value)
}