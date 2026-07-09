import type { StandardStatus } from '@kws/schema';
import type { UUIDv7 } from '@kws/types';

import { media, members, mlsMedia, offices, properties } from '@kws/schema';
import { and, asc, eq, gt, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/lib/database';

export type MlsMediaEntityType = 'properties' | 'members' | 'offices';
export type MlsMediaAssociationMode =
  | 'stale-or-unprocessed'
  | 'stale-only'
  | 'unprocessed-only'
  | 'repair-missing-files';

export interface MlsMediaSyncCandidate {
  mediaKey: string;
  mediaURL: string;
  resourceRecordKey: string;
  mediaId: UUIDv7 | null;
  mlsUpdatedAt: string | null;
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
  /**
   * When true, all property media rows are restricted to primary media
   * (`preferredPhotoYN = true` OR `order = 1`) regardless of prioritization.
   */
  primaryOnlyForAllProperties?: boolean;
  /**
   * When set, only rows whose resolved entity type is one of the provided
   * values are returned.  Useful for running per-entity-type media phases.
   */
  filterEntityTypes?: MlsMediaEntityType[];
  /**
   * When set, property media is restricted to listings where the list agent
   * or co-list agent matches one of the provided member keys / MLS IDs.
   * Has no effect unless `filterEntityTypes` includes `'properties'`.
   */
  restrictToMemberPropertyKeys?: string[];
  /**
   * When set, property media is restricted to listings where the list office
   * or co-list office matches one of the provided office keys / MLS IDs.
   * Has no effect unless `filterEntityTypes` includes `'properties'`.
   */
  restrictToOfficePropertyKeys?: string[];
  /**
   * When set, member entity media rows are restricted to matching MemberMlsId.
   */
  restrictToMemberEntityKeys?: string[];
  /**
   * When set, office entity media rows are restricted to matching OfficeMlsId.
   */
  restrictToOfficeEntityKeys?: string[];
  /**
   * When true, property media candidates not associated to prioritized
   * configured member/office keys are restricted to viewable listings in one
   * of the active standard statuses.
   */
  enforceEligibilityForNonAssociatedProperties?: boolean;
  /**
   * Active property statuses used when
   * `enforceEligibilityForNonAssociatedProperties` is true.
   */
  activePropertyStatuses?: string[];
  /**
   * Candidate eligibility mode:
   * - `stale-or-unprocessed` includes unprocessed rows and stale linked rows.
   * - `stale-only` includes only rows with existing media associations that
   *   are stale or otherwise require relinking/refresh.
   * - `unprocessed-only` includes only rows without a media association.
   * - `repair-missing-files` includes only linked active rows so callers can
   *   decide whether on-disk media variants need repair.
   */
  associationMode?: MlsMediaAssociationMode;
}

type CandidateRow = {
  mediaKey: string;
  mediaURL: string | null;
  resourceRecordKey: string | null;
  mediaId: UUIDv7 | null;
  mlsUpdatedAt: string | null;
  linkedMediaId: UUIDv7 | null;
  longDescription: string | null;
  imageSizeDescription: string | null;
  unparsedAddress: string | null;
  photoOrder: number | null;
  listingKey: string | null;
  memberFullName: string | null;
  memberMlsId: string | null;
  officeName: string | null;
  officeMlsId: string | null;
};

const DEFAULT_ACTIVE_PROPERTY_STATUSES: readonly StandardStatus[] = [
  'Active',
  'ActiveUnderContract',
  'ComingSoon',
];

function toMlsMediaSyncCandidates(rows: CandidateRow[]): MlsMediaSyncCandidate[] {
  return rows.flatMap((row) => {
    if (!row.mediaURL || !row.resourceRecordKey) {
      return [];
    }

    const entityType = resolveEntityType({
      listingKey: row.listingKey,
      memberMlsId: row.memberMlsId,
      officeMlsId: row.officeMlsId,
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
  memberMlsId: string | null;
  officeMlsId: string | null;
}): MlsMediaEntityType | null {
  if (input.listingKey) {
    return 'properties';
  }
  if (input.memberMlsId) {
    return 'members';
  }
  if (input.officeMlsId) {
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
  const primaryOnlyForAllProperties = options.primaryOnlyForAllProperties ?? false;
  const filterEntityTypes = options.filterEntityTypes ?? [];
  const propertyOnlyFilter =
    filterEntityTypes.length === 1 && filterEntityTypes[0] === 'properties';
  const associationMode = options.associationMode ?? 'stale-or-unprocessed';
  const restrictToMemberPropertyKeys = [
    ...new Set((options.restrictToMemberPropertyKeys ?? []).filter(Boolean)),
  ];
  const restrictToOfficePropertyKeys = [
    ...new Set((options.restrictToOfficePropertyKeys ?? []).filter(Boolean)),
  ];
  const restrictToMemberEntityKeys = [
    ...new Set((options.restrictToMemberEntityKeys ?? []).filter(Boolean)),
  ];
  const restrictToOfficeEntityKeys = [
    ...new Set((options.restrictToOfficeEntityKeys ?? []).filter(Boolean)),
  ];
  const enforceEligibilityForNonAssociatedProperties =
    options.enforceEligibilityForNonAssociatedProperties ?? false;
  const activePropertyStatuses: StandardStatus[] = [
    ...new Set(
      (options.activePropertyStatuses && options.activePropertyStatuses.length > 0
        ? options.activePropertyStatuses
        : [...DEFAULT_ACTIVE_PROPERTY_STATUSES]
      ).filter(Boolean) as StandardStatus[],
    ),
  ];

  const baseMediaRowEligibilityClause = and(
    or(isNull(mlsMedia.deletedAt), and(isNotNull(mlsMedia.deletedAt), isNull(mlsMedia.mediaId))),
    isNotNull(mlsMedia.mediaURL),
    isNotNull(mlsMedia.resourceRecordKey),
  );

  const unprocessedAssociationClause = and(baseMediaRowEligibilityClause, isNull(mlsMedia.mediaId));

  const stalenessWhereClause = and(
    baseMediaRowEligibilityClause,
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

  const staleOnlyAssociationClause = and(
    baseMediaRowEligibilityClause,
    isNotNull(mlsMedia.mediaId),
    or(
      isNull(media.id),
      isNotNull(media.deletedAt),
      isNull(media.updatedAt),
      and(
        isNotNull(mlsMedia.mediaModificationTimestamp),
        gt(mlsMedia.mediaModificationTimestamp, media.updatedAt),
      ),
    ),
  );

  const repairMissingFilesClause = and(
    baseMediaRowEligibilityClause,
    isNotNull(mlsMedia.mediaId),
    isNotNull(media.id),
    isNull(media.deletedAt),
  );

  const baseEligibilityClause =
    associationMode === 'unprocessed-only'
      ? unprocessedAssociationClause
      : associationMode === 'stale-only'
        ? staleOnlyAssociationClause
        : associationMode === 'repair-missing-files'
          ? repairMissingFilesClause
          : stalenessWhereClause;

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

  const isViewableMemberMediaClause = and(
    isNotNull(members.memberMlsId),
    isNull(members.deletedAt),
    eq(members.mlgCanView, true),
  );
  const isViewableOfficeMediaClause = and(
    isNotNull(offices.officeMlsId),
    isNull(offices.deletedAt),
    eq(offices.mlgCanView, true),
  );
  const isEntityMediaClause = or(isViewableMemberMediaClause, isViewableOfficeMediaClause);
  const prioritizedPropertyListingClause = prioritizedPropertyMatchClause
    ? and(isNotNull(properties.listingKey), prioritizedPropertyMatchClause)
    : undefined;
  const nonPrioritizedPropertyListingClause = prioritizedPropertyMatchClause
    ? and(isNotNull(properties.listingKey), sql`not (${prioritizedPropertyMatchClause})`)
    : isNotNull(properties.listingKey);
  const primaryPhotoClause = or(eq(mlsMedia.preferredPhotoYN, true), eq(mlsMedia.order, 1));

  const candidateWhereClause = propertyOnlyFilter
    ? primaryOnlyForAllProperties || primaryOnlyForNonPrioritizedProperties
      ? and(baseEligibilityClause, isNotNull(properties.listingKey), primaryPhotoClause)
      : and(baseEligibilityClause, isNotNull(properties.listingKey))
    : primaryOnlyForAllProperties
      ? and(
        baseEligibilityClause,
        or(isEntityMediaClause, and(isNotNull(properties.listingKey), primaryPhotoClause)),
      )
      : primaryOnlyForNonPrioritizedProperties
        ? and(
          baseEligibilityClause,
          prioritizedPropertyListingClause
            ? or(
              isEntityMediaClause,
              prioritizedPropertyListingClause,
              and(nonPrioritizedPropertyListingClause, primaryPhotoClause),
            )
            : or(
              isEntityMediaClause,
              and(nonPrioritizedPropertyListingClause, primaryPhotoClause),
            ),
        )
        : baseEligibilityClause;

  const entityTypeFilterClause =
    filterEntityTypes.length > 0
      ? or(
        filterEntityTypes.includes('properties') ? isNotNull(properties.listingKey) : undefined,
        filterEntityTypes.includes('members') ? isNotNull(members.memberMlsId) : undefined,
        filterEntityTypes.includes('offices') ? isNotNull(offices.officeMlsId) : undefined,
      )
      : undefined;

  const memberPropertyRestrictionClause =
    restrictToMemberPropertyKeys.length > 0
      ? and(
        isNotNull(properties.listingKey),
        or(
          inArray(properties.listAgentKey, restrictToMemberPropertyKeys),
          inArray(properties.listAgentMlsId, restrictToMemberPropertyKeys),
          inArray(properties.coListAgentKey, restrictToMemberPropertyKeys),
          inArray(properties.coListAgentMlsId, restrictToMemberPropertyKeys),
        ),
      )
      : undefined;

  const officePropertyRestrictionClause =
    restrictToOfficePropertyKeys.length > 0
      ? and(
        isNotNull(properties.listingKey),
        or(
          inArray(properties.listOfficeKey, restrictToOfficePropertyKeys),
          inArray(properties.listOfficeMlsId, restrictToOfficePropertyKeys),
          inArray(properties.coListOfficeKey, restrictToOfficePropertyKeys),
          inArray(properties.coListOfficeMlsId, restrictToOfficePropertyKeys),
        ),
      )
      : undefined;

  const propertyAssociationRestrictionClause =
    memberPropertyRestrictionClause && officePropertyRestrictionClause
      ? or(memberPropertyRestrictionClause, officePropertyRestrictionClause)
      : (memberPropertyRestrictionClause ?? officePropertyRestrictionClause);

  const viewableActivePropertyClause = and(
    isNotNull(properties.listingKey),
    eq(properties.mlgCanView, true),
    inArray(properties.standardStatus, activePropertyStatuses),
  );

  const nonAssociatedPropertyEligibilityClause = enforceEligibilityForNonAssociatedProperties
    ? propertyOnlyFilter
      ? prioritizedPropertyListingClause
        ? or(
          prioritizedPropertyListingClause,
          and(nonPrioritizedPropertyListingClause, viewableActivePropertyClause),
        )
        : viewableActivePropertyClause
      : prioritizedPropertyMatchClause
        ? or(
          isEntityMediaClause,
          prioritizedPropertyListingClause,
          and(nonPrioritizedPropertyListingClause, viewableActivePropertyClause),
        )
        : or(isEntityMediaClause, viewableActivePropertyClause)
    : undefined;

  const memberEntityRestrictionClause =
    restrictToMemberEntityKeys.length > 0
      ? and(
        isNotNull(members.memberMlsId),
        inArray(members.memberMlsId, restrictToMemberEntityKeys),
      )
      : undefined;

  const officeEntityRestrictionClause =
    restrictToOfficeEntityKeys.length > 0
      ? and(
        isNotNull(offices.officeMlsId),
        inArray(offices.officeMlsId, restrictToOfficeEntityKeys),
      )
      : undefined;

  const entityRecordRestrictionClause =
    memberEntityRestrictionClause && officeEntityRestrictionClause
      ? or(memberEntityRestrictionClause, officeEntityRestrictionClause)
      : (memberEntityRestrictionClause ?? officeEntityRestrictionClause);

  const finalWhereClause = and(
    candidateWhereClause,
    entityTypeFilterClause,
    propertyAssociationRestrictionClause,
    entityRecordRestrictionClause,
    nonAssociatedPropertyEligibilityClause,
  );

  // Fast path for the hottest queue: property-only, unprocessed candidates.
  // Avoid joining members/offices/media because those tables are not needed
  // to evaluate eligibility in this mode.
  if (
    propertyOnlyFilter
    && associationMode === 'unprocessed-only'
    && restrictToMemberEntityKeys.length === 0
    && restrictToOfficeEntityKeys.length === 0
  ) {
    const rows =
      limit > 0
        ? await db
          .select({
            mediaKey: mlsMedia.mediaKey,
            mediaURL: mlsMedia.mediaURL,
            resourceRecordKey: mlsMedia.resourceRecordKey,
            mediaId: mlsMedia.mediaId,
            mlsUpdatedAt: mlsMedia.mediaModificationTimestamp,
            longDescription: mlsMedia.longDescription,
            imageSizeDescription: mlsMedia.imageSizeDescription,
            unparsedAddress: properties.unparsedAddress,
            photoOrder: mlsMedia.order,
            listingKey: properties.listingKey,
          })
          .from(mlsMedia)
          .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
          .where(finalWhereClause)
          .orderBy(asc(mlsMedia.updatedAt), asc(mlsMedia.mediaKey))
          .limit(limit)
        : [];

    return rows.flatMap((row) => {
      if (!row.mediaURL || !row.resourceRecordKey || !row.listingKey) {
        return [];
      }

      return [
        {
          mediaKey: row.mediaKey,
          mediaURL: row.mediaURL,
          resourceRecordKey: row.resourceRecordKey,
          mediaId: (row.mediaId as UUIDv7 | null) ?? null,
          mlsUpdatedAt: row.mlsUpdatedAt ?? null,
          linkedMediaExists: false,
          longDescription: row.longDescription ?? null,
          imageSizeDescription: row.imageSizeDescription ?? null,
          unparsedAddress: row.unparsedAddress ?? null,
          photoOrder: row.photoOrder ?? null,
          entityLabel: row.unparsedAddress ?? null,
          entityType: 'properties' as const,
        } satisfies MlsMediaSyncCandidate,
      ];
    });
  }

  const priorityBucket = propertyOnlyFilter
    ? sql<number>`1`
    : prioritizedPropertyMatchClause
      ? sql<number>`case
        when ${isNotNull(members.memberMlsId)} or ${isNotNull(offices.officeMlsId)} then 0
        when ${and(isNotNull(properties.listingKey), prioritizedPropertyMatchClause)} then 1
        else 2
      end`
      : sql<number>`case
        when ${isNotNull(members.memberMlsId)} or ${isNotNull(offices.officeMlsId)} then 0
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
      memberMlsId: members.memberMlsId,
      officeName: offices.officeName,
      officeMlsId: offices.officeMlsId,
    })
    .from(mlsMedia)
    .leftJoin(media, eq(mlsMedia.mediaId, media.id))
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberMlsId))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeMlsId));

  const rows: CandidateRow[] =
    limit > 0
      ? await baseSelect
        .where(finalWhereClause)
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
      memberMlsId: members.memberMlsId,
      officeName: offices.officeName,
      officeMlsId: offices.officeMlsId,
    })
    .from(mlsMedia)
    .leftJoin(media, eq(mlsMedia.mediaId, media.id))
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberMlsId))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeMlsId))
    .where(
      and(
        eq(mlsMedia.resourceRecordKey, listingKey),
        or(
          isNull(mlsMedia.deletedAt),
          and(isNotNull(mlsMedia.deletedAt), isNull(mlsMedia.mediaId)),
        ),
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
