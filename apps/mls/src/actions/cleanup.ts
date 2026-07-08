import { lookups, members, offices, openHouses, properties } from '@kws/schema';
import { and, eq, isNotNull, lte } from 'drizzle-orm';

import { MLS_SYNC_DEFAULTS } from '@/lib/constants';
import { db } from '@/lib/database';

import {
  pruneEmptyMlsMediaDirectories,
  purgeDeadMlsMedia,
  purgeDeadMlsPropertyMedia,
  purgeEntityMedia,
  type DeadMlsMediaPurgeSummary,
  type EntityMediaPurgeSummary,
} from '../repositories/media-cleanup.repository';

export interface MlsCleanupSummary {
  cutoffAt: string;
  retentionDays: number;
  deleted: {
    lookups: number;
    offices: number;
    members: number;
    openHouses: number;
    properties: number;
  };
  mediaPurged: {
    members: EntityMediaPurgeSummary;
    offices: EntityMediaPurgeSummary;
    properties: EntityMediaPurgeSummary;
    deadPropertyMedia: DeadMlsMediaPurgeSummary;
    deadEntityMedia: DeadMlsMediaPurgeSummary;
    prunedEmptyDirectories: number;
    totals: EntityMediaPurgeSummary;
  };
  totalDeleted: number;
}

function getCutoffDate(retentionDays: number) {
  return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
}

export async function runMlsCleanup(
  retentionDays = MLS_SYNC_DEFAULTS.cleanupRetentionDays,
): Promise<MlsCleanupSummary> {
  const cutoff = getCutoffDate(retentionDays);

  const [memberRowsToDelete, officeRowsToDelete, propertyRowsToDelete] = await Promise.all([
    db
      .select({ resourceRecordKey: members.memberMlsId })
      .from(members)
      .where(and(isNotNull(members.deletedAt), lte(members.deletedAt, cutoff))),
    db
      .select({ resourceRecordKey: offices.officeMlsId })
      .from(offices)
      .where(and(isNotNull(offices.deletedAt), lte(offices.deletedAt, cutoff))),
    db
      .select({ resourceRecordKey: properties.listingKey })
      .from(properties)
      .where(
        and(
          eq(properties.mlgCanView, false),
          isNotNull(properties.deletedAt),
          lte(properties.deletedAt, cutoff),
        ),
      ),
  ]);

  const memberKeys = memberRowsToDelete
    .map((row) => row.resourceRecordKey)
    .filter((key): key is string => Boolean(key));
  const officeKeys = officeRowsToDelete
    .map((row) => row.resourceRecordKey)
    .filter((key): key is string => Boolean(key));
  const propertyKeys = propertyRowsToDelete
    .map((row) => row.resourceRecordKey)
    .filter((key): key is string => Boolean(key));

  const [
    membersMediaPurge,
    officesMediaPurge,
    propertiesMediaPurge,
    deadPropertyMediaPurge,
    deadEntityMediaPurge,
  ] = await Promise.all([
    purgeEntityMedia(memberKeys),
    purgeEntityMedia(officeKeys),
    purgeEntityMedia(propertyKeys),
    purgeDeadMlsPropertyMedia(),
    purgeDeadMlsMedia(['members', 'offices']),
  ]);

  const prunedEmptyDirectories = await pruneEmptyMlsMediaDirectories();

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
    ]);

  const deleted = {
    lookups: lookupDeleted.length,
    offices: officeDeleted.length,
    members: memberDeleted.length,
    openHouses: openHouseDeleted.length,
    properties: propertyDeleted.length,
  };

  const mediaPurged = {
    members: membersMediaPurge,
    offices: officesMediaPurge,
    properties: propertiesMediaPurge,
    deadPropertyMedia: deadPropertyMediaPurge,
    deadEntityMedia: deadEntityMediaPurge,
    prunedEmptyDirectories,
    totals: {
      mediaDeleted:
        membersMediaPurge.mediaDeleted +
        officesMediaPurge.mediaDeleted +
        propertiesMediaPurge.mediaDeleted +
        deadPropertyMediaPurge.mediaDeleted +
        deadEntityMediaPurge.mediaDeleted,
      variantFilesDeleted:
        membersMediaPurge.variantFilesDeleted +
        officesMediaPurge.variantFilesDeleted +
        propertiesMediaPurge.variantFilesDeleted +
        deadPropertyMediaPurge.variantFilesDeleted +
        deadEntityMediaPurge.variantFilesDeleted,
      mlsMediaRowsDeleted:
        membersMediaPurge.mlsMediaRowsDeleted +
        officesMediaPurge.mlsMediaRowsDeleted +
        propertiesMediaPurge.mlsMediaRowsDeleted,
    },
  };

  return {
    cutoffAt: cutoff.toISOString(),
    retentionDays,
    deleted,
    mediaPurged,
    totalDeleted: Object.values(deleted).reduce((sum, count) => sum + count, 0),
  };
}
