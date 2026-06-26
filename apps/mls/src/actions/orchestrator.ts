// ---------------------------------------------------------------------------
// MLS sync orchestrator
// ---------------------------------------------------------------------------
// Runs resources in dependency order: Lookup → Office → Member → Property → OpenHouse
// Exposes runFullSync (initial-capable) and runDeltaSync (delta-only).
// ---------------------------------------------------------------------------
import { startOfYear } from 'date-fns'

import type { SyncResult, SyncSummary } from '../types'

import { logger } from '@/lib/logger'
import { fetchLookups, fetchMembers, fetchOffices, fetchOpenHouses, fetchPropertiesForInitialSeed } from '@/lib/utils/fetch'
import { mapLookup } from '@/maps/lookup.mapper'
import { mapMember } from '@/maps/member.mapper'
import { mapOffice } from '@/maps/office.mapper'
import { mapOpenHouse } from '@/maps/open-house.mapper'
import { mapProperty } from '@/maps/property.mapper'
import { env } from '@kws/config/env'
import { upsertLookups } from '../repositories/lookup.repository'
import {
  processMlsMembersPayload
} from '../repositories/member.repository'
import {
  processMlsOfficesPayload
} from '../repositories/office.repository'
import {
  upsertOpenHouses
} from '../repositories/open-house.repository'
import {
  processMlsPropertiesPayload
} from '../repositories/property.repository'
import { seedResource } from './seed-resource'

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

function memberSeedConfig(osn: string) {
  return seedResource({
    resource: 'Member',
    osn,
    fetchFn: fetchMembers,
    upsert: async (payload) => processMlsMembersPayload(payload.map(mapMember)),
  })
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

function openHouseSeedConfig(osn: string) {
  return seedResource({
    resource: 'OpenHouse',
    osn,
    fetchFn: fetchOpenHouses,
    upsert: async (payload) => upsertOpenHouses(payload.map(mapOpenHouse)),
  })
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

// ---------------------------------------------------------------------------
// Public orchestration functions
// ---------------------------------------------------------------------------

export async function runFullSeed(
  osn: string = env.MLS_ORIGINATING_SYSTEM_NAME,
): Promise<SyncSummary> {
  return runSeedAllResources(osn, 'initial')
}