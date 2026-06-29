import { and, eq, isNotNull, lte } from 'drizzle-orm'

import { db } from '@/lib/database'
import mlsEnv from '@kws/config/env/mls'
import { lookups, members, offices, openHouses, properties } from '@kws/schema'

export interface MlsCleanupSummary {
  cutoffAt: string
  retentionDays: number
  deleted: {
    lookups: number
    offices: number
    members: number
    openHouses: number
    properties: number
  }
  totalDeleted: number
}

function getCutoffDate(retentionDays: number) {
  return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
}

export async function runMlsCleanup(
  retentionDays = mlsEnv.MLS_CLEANUP_RETENTION_DAYS,
): Promise<MlsCleanupSummary> {
  const cutoff = getCutoffDate(retentionDays)

  const [lookupDeleted, officeDeleted, memberDeleted, openHouseDeleted, propertyDeleted] =
    await Promise.all([
      db
        .delete(lookups)
        .where(and(isNotNull(lookups.deletedAt), lte(lookups.deletedAt, cutoff)))
        .returning({ id: lookups.lookupKey }),
      db
        .delete(offices)
        .where(and(isNotNull(offices.deletedAt), lte(offices.deletedAt, cutoff)))
        .returning({ id: offices.officeKey }),
      db
        .delete(members)
        .where(and(isNotNull(members.deletedAt), lte(members.deletedAt, cutoff)))
        .returning({ id: members.memberKey }),
      db
        .delete(openHouses)
        .where(and(isNotNull(openHouses.deletedAt), lte(openHouses.deletedAt, cutoff)))
        .returning({ id: openHouses.openHouseKey }),
      db
        .delete(properties)
        .where(
          and(
            eq(properties.mlgCanView, false),
            isNotNull(properties.deletedAt),
            lte(properties.deletedAt, cutoff),
          ),
        )
        .returning({ id: properties.listingKey }),
    ])

  const deleted = {
    lookups: lookupDeleted.length,
    offices: officeDeleted.length,
    members: memberDeleted.length,
    openHouses: openHouseDeleted.length,
    properties: propertyDeleted.length,
  }

  return {
    cutoffAt: cutoff.toISOString(),
    retentionDays,
    deleted,
    totalDeleted: Object.values(deleted).reduce((sum, count) => sum + count, 0),
  }
}
