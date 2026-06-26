import { and, asc, eq, gt, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';

import type { UUIDv7 } from '@kws/types';

import { db } from '@/lib/database';
import { media, members, mlsMedia, offices, properties } from '@kws/schema';

export type MlsMediaEntityType = 'properties' | 'members' | 'offices';

export interface MlsMediaSyncCandidate {
  mediaKey: string;
  mediaURL: string;
  resourceRecordKey: string;
  mediaId: UUIDv7 | null;
  mlsUpdatedAt: Date | null;
  linkedMediaExists: boolean;
  longDescription: string | null;
  imageSizeDescription: string | null;
  unparsedAddress: string | null;
  photoOrder: number | null;
  entityLabel: string | null;
  entityType: MlsMediaEntityType;
}

export interface ListMlsMediaSyncCandidatesOptions {
  /**
   * Optional ordering hint for property media rows associated with members.
   * In single-phase sync these rows are prioritized after entity media.
   */
  prioritizeMemberKeys?: string[];
  /**
   * Optional ordering hint for property media rows associated with offices.
   * In single-phase sync these rows are prioritized after entity media.
   */
  prioritizeOfficeKeys?: string[];
  /**
   * When true, non-prioritized property listings are restricted to primary
   * media rows (`preferredPhotoYN = true` OR `order = 1`).
   */
  primaryOnlyForNonPrioritizedProperties?: boolean;
}

type CandidateRow = {
  mediaKey: string;
  mediaURL: string | null;
  resourceRecordKey: string | null;
  mediaId: UUIDv7 | null;
  mlsUpdatedAt: Date | null;
  linkedMediaId: UUIDv7 | null;
  longDescription: string | null;
  imageSizeDescription: string | null;
  unparsedAddress: string | null;
  photoOrder: number | null;
  listingKey: string | null;
  memberFullName: string | null;
  memberKey: string | null;
  officeName: string | null;
  officeKey: string | null;
};

function toMlsMediaSyncCandidates(rows: CandidateRow[]): MlsMediaSyncCandidate[] {
  return rows.flatMap((row) => {
    if (!row.mediaURL || !row.resourceRecordKey) {
      return [];
    }

    const entityType = resolveEntityType({
      listingKey: row.listingKey,
      memberKey: row.memberKey,
      officeKey: row.officeKey,
    });

    if (!entityType) {
      return [];
    }

    return [
      {
        mediaKey: row.mediaKey,
        mediaURL: row.mediaURL,
        resourceRecordKey: row.resourceRecordKey,
        mediaId: (row.mediaId as UUIDv7 | null) ?? null,
        mlsUpdatedAt: row.mlsUpdatedAt ?? null,
        linkedMediaExists: row.linkedMediaId !== null,
        longDescription: row.longDescription ?? null,
        imageSizeDescription: row.imageSizeDescription ?? null,
        unparsedAddress: row.unparsedAddress ?? null,
        photoOrder: row.photoOrder ?? null,
        entityLabel: row.unparsedAddress ?? row.memberFullName ?? row.officeName ?? null,
        entityType,
      } satisfies MlsMediaSyncCandidate,
    ];
  });
}

function resolveEntityType(input: {
  listingKey: string | null;
  memberKey: string | null;
  officeKey: string | null;
}): MlsMediaEntityType | null {
  if (input.listingKey) {
    return 'properties';
  }
  if (input.memberKey) {
    return 'members';
  }
  if (input.officeKey) {
    return 'offices';
  }
  return null;
}

export async function listMlsMediaSyncCandidates(
  limit = 50,
  options: ListMlsMediaSyncCandidatesOptions = {},
): Promise<MlsMediaSyncCandidate[]> {
  const prioritizedMemberKeys = [...new Set((options.prioritizeMemberKeys ?? []).filter(Boolean))];
  const prioritizedOfficeKeys = [...new Set((options.prioritizeOfficeKeys ?? []).filter(Boolean))];
  const primaryOnlyForNonPrioritizedProperties =
    options.primaryOnlyForNonPrioritizedProperties ?? false;

  const stalenessWhereClause = and(
    isNull(mlsMedia.deletedAt),
    isNotNull(mlsMedia.mediaURL),
    isNotNull(mlsMedia.resourceRecordKey),
    or(
      isNull(mlsMedia.mediaId),
      isNull(media.id),
      isNotNull(media.deletedAt),
      isNull(media.updatedAt),
      and(
        isNotNull(mlsMedia.mediaModificationTimestamp),
        gt(mlsMedia.mediaModificationTimestamp, media.updatedAt),
      ),
    ),
  );

  const prioritizedMemberPropertyMatchClause =
    prioritizedMemberKeys.length > 0
      ? or(
        inArray(properties.listAgentKey, prioritizedMemberKeys),
        inArray(properties.listAgentMlsId, prioritizedMemberKeys),
        inArray(properties.coListAgentKey, prioritizedMemberKeys),
        inArray(properties.coListAgentMlsId, prioritizedMemberKeys),
      )
      : undefined;

  const prioritizedOfficePropertyMatchClause =
    prioritizedOfficeKeys.length > 0
      ? or(
        inArray(properties.listOfficeKey, prioritizedOfficeKeys),
        inArray(properties.listOfficeMlsId, prioritizedOfficeKeys),
        inArray(properties.coListOfficeKey, prioritizedOfficeKeys),
        inArray(properties.coListOfficeMlsId, prioritizedOfficeKeys),
      )
      : undefined;

  const prioritizedPropertyMatchClause =
    prioritizedMemberPropertyMatchClause && prioritizedOfficePropertyMatchClause
      ? or(prioritizedMemberPropertyMatchClause, prioritizedOfficePropertyMatchClause)
      : (prioritizedMemberPropertyMatchClause ?? prioritizedOfficePropertyMatchClause);

  const isEntityMediaClause = or(isNotNull(members.memberKey), isNotNull(offices.officeKey));
  const prioritizedPropertyListingClause = prioritizedPropertyMatchClause
    ? and(isNotNull(properties.listingKey), prioritizedPropertyMatchClause)
    : undefined;
  const nonPrioritizedPropertyListingClause = prioritizedPropertyMatchClause
    ? and(isNotNull(properties.listingKey), sql`not (${prioritizedPropertyMatchClause})`)
    : isNotNull(properties.listingKey);
  const primaryPhotoClause = or(eq(mlsMedia.preferredPhotoYN, true), eq(mlsMedia.order, 1));

  const candidateWhereClause = primaryOnlyForNonPrioritizedProperties
    ? and(
      stalenessWhereClause,
      prioritizedPropertyListingClause
        ? or(
          isEntityMediaClause,
          prioritizedPropertyListingClause,
          and(nonPrioritizedPropertyListingClause, primaryPhotoClause),
        )
        : or(isEntityMediaClause, and(nonPrioritizedPropertyListingClause, primaryPhotoClause)),
    )
    : stalenessWhereClause;

  const priorityBucket = prioritizedPropertyMatchClause
    ? sql<number>`case
        when ${isNotNull(members.memberKey)} or ${isNotNull(offices.officeKey)} then 0
        when ${and(isNotNull(properties.listingKey), prioritizedPropertyMatchClause)} then 1
        else 2
      end`
    : sql<number>`case
        when ${isNotNull(members.memberKey)} or ${isNotNull(offices.officeKey)} then 0
        else 1
      end`;

  const baseSelect = db
    .select({
      mediaKey: mlsMedia.mediaKey,
      mediaURL: mlsMedia.mediaURL,
      resourceRecordKey: mlsMedia.resourceRecordKey,
      mediaId: mlsMedia.mediaId,
      mlsUpdatedAt: mlsMedia.mediaModificationTimestamp,
      linkedMediaId: media.id,
      longDescription: mlsMedia.longDescription,
      imageSizeDescription: mlsMedia.imageSizeDescription,
      unparsedAddress: properties.unparsedAddress,
      photoOrder: mlsMedia.order,
      listingKey: properties.listingKey,
      memberFullName: members.memberFullName,
      memberKey: members.memberKey,
      officeName: offices.officeName,
      officeKey: offices.officeKey,
    })
    .from(mlsMedia)
    .leftJoin(media, eq(mlsMedia.mediaId, media.id))
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberKey))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeKey));

  const rows: CandidateRow[] =
    limit > 0
      ? await baseSelect
        .where(candidateWhereClause)
        .orderBy(priorityBucket, asc(mlsMedia.updatedAt), asc(mlsMedia.mediaKey))
        .limit(limit)
      : [];

  return toMlsMediaSyncCandidates(rows);
}

/**
 * Returns unsynced media rows for a specific listing. This uses the same
 * staleness criteria as the batch sync queue and scopes by listing key.
 */
export async function listUnsyncedMediaForListing(
  listingKey: string,
): Promise<MlsMediaSyncCandidate[]> {
  const rows: CandidateRow[] = await db
    .select({
      mediaKey: mlsMedia.mediaKey,
      mediaURL: mlsMedia.mediaURL,
      resourceRecordKey: mlsMedia.resourceRecordKey,
      mediaId: mlsMedia.mediaId,
      mlsUpdatedAt: mlsMedia.mediaModificationTimestamp,
      linkedMediaId: media.id,
      longDescription: mlsMedia.longDescription,
      imageSizeDescription: mlsMedia.imageSizeDescription,
      unparsedAddress: properties.unparsedAddress,
      photoOrder: mlsMedia.order,
      listingKey: properties.listingKey,
      memberFullName: members.memberFullName,
      memberKey: members.memberKey,
      officeName: offices.officeName,
      officeKey: offices.officeKey,
    })
    .from(mlsMedia)
    .leftJoin(media, eq(mlsMedia.mediaId, media.id))
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberKey))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeKey))
    .where(
      and(
        eq(mlsMedia.resourceRecordKey, listingKey),
        isNull(mlsMedia.deletedAt),
        isNotNull(mlsMedia.mediaURL),
        isNotNull(mlsMedia.resourceRecordKey),
        or(
          isNull(mlsMedia.mediaId),
          isNull(media.id),
          isNotNull(media.deletedAt),
          isNull(media.updatedAt),
          and(
            isNotNull(mlsMedia.mediaModificationTimestamp),
            gt(mlsMedia.mediaModificationTimestamp, media.updatedAt),
          ),
        ),
      ),
    )
    .orderBy(asc(mlsMedia.order), asc(mlsMedia.mediaKey));

  return toMlsMediaSyncCandidates(rows);
}
