
import { mlsLogger } from '@/lib/logger'
import { env } from '@kws/config'
import {
  isMlsDeltaResourceName
} from './orchestrator'

import { deltaSyncResource } from '@/app/sync'
import { MLS_RESOURCE_NAMES } from '@/lib/constants'
import type { MlsResource } from '@/types'
import { runMlsCleanup } from './cleanup'

export const MLS_INITIAL_TRIGGER_JOB_TYPE = 'mls.sync.initial.trigger'
export const MLS_INITIAL_PIPELINE_JOB_TYPE = 'mls.sync.initial.pipeline'
export const MLS_DELTA_TRIGGER_JOB_TYPE = 'mls.sync.delta.trigger'
export const MLS_DELTA_PIPELINE_JOB_TYPE = 'mls.sync.delta.pipeline'
export const MLS_DELTA_HOURLY_SCHEDULE_ID = 'mls.delta.hourly'
export const MLS_DELTA_RESOURCE_PIPELINE_JOB_TYPE = 'mls.sync.delta.resource.pipeline'
export const MLS_CLEANUP_JOB_TYPE = 'mls.sync.cleanup'
export const MLS_CLEANUP_HOURLY_SCHEDULE_ID = 'mls.cleanup.hourly'
export const MLS_OPENHOUSE_RECONCILE_JOB_TYPE = 'mls.sync.openhouse.reconcile'
export const MLS_OPENHOUSE_RECONCILE_HOURLY_SCHEDULE_ID = 'mls.openhouse.reconcile.hourly'

const DEFAULT_RESOURCE_CRON: Record<MlsResource, string> = {
  Lookup: '0 6 * * *',
  Property: '10 * * * *',
  Office: '15 * * * *',
  Member: '20 * * * *',
  OpenHouse: '25 * * * *',
}

const syncMlsLogger = mlsLogger.child('mls-sync')

function defaultResourceScheduleId(resource: MlsResource) {
  return `mls.delta.hourly.${resource.toLowerCase()}`
}

function resolveMlsDeltaResourceSchedules() {
  const enabled = env.MLS_QUEUE_ENABLE_HOURLY_SYNC
  const overrides = new Map<MlsResource, string>()
  for (const value of env.MLS_QUEUE_RESOURCE_CRON_SCHEDULES) {
    const [rawResource, rawCron] = value.split(':', 2)
    const resource = rawResource?.trim()
    const cronExpression = rawCron?.trim()
    if (!resource || !cronExpression || !isMlsDeltaResourceName(resource)) {
      continue
    }
    overrides.set(resource, cronExpression)
  }

  return MLS_RESOURCE_NAMES.map((resource) => ({
    scheduleId: defaultResourceScheduleId(resource),
    resource,
    cronExpression: overrides.get(resource) ?? DEFAULT_RESOURCE_CRON[resource],
    syncFunction: deltaSyncResource.bind(null, resource),
    enabled,
  }))
}

function resolveMlsCleanupSchedule() {
  const enabled = env.MLS_QUEUE_ENABLE_CLEANUP
  const cronExpression = env.MLS_QUEUE_CLEANUP_CRON || '2 * * * *'

  return {
    scheduleId: MLS_CLEANUP_HOURLY_SCHEDULE_ID,
    cronExpression,
    cleanupFunction: runMlsCleanup,
    enabled,
  }
}


export function listMlsDeltaScheduleIds() {
  return resolveMlsDeltaResourceSchedules().map((entry) => entry.scheduleId)
}

export function listMlsManagedScheduleIds() {
  return [
    ...listMlsDeltaScheduleIds(),
    resolveMlsCleanupSchedule().scheduleId,
  ]
}


export function registerMlsSyncJobTypes() {
  const scheduleEntries = resolveMlsDeltaResourceSchedules()
  const cleanupSchedule = resolveMlsCleanupSchedule()


  for (const entry of scheduleEntries) {
    Bun.cron(entry.cronExpression, async () => {
      if (!entry.enabled) {
        syncMlsLogger.debug('skipping disabled schedule', {
          scheduleId: entry.scheduleId,
          resource: entry.resource,
        })
        return
      }
      await entry.syncFunction()
    })
  }

  Bun.cron(cleanupSchedule.cronExpression, async () => {
    if (!cleanupSchedule.enabled) {
      syncMlsLogger.debug('skipping disabled cleanup schedule', {
        scheduleId: cleanupSchedule.scheduleId,
      })
      return
    }
    await cleanupSchedule.cleanupFunction()
  })

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
  })
}
