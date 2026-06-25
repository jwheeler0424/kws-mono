import { mediaVariants, mlsMedia, properties } from '@kws/schema';
import type { StandardStatus, TPropertyCard, TPropertyNwmFlags } from '@kws/types';

import { db } from '@/lib/database';
import { and, eq, inArray, isNull, or, Placeholder, SQL, sql } from 'drizzle-orm';
import { DEFAULT_ACTIVE_STATUSES, DEFAULT_FEATURED_STATUSES, DEFAULT_PENDING_STATUSES, DEFAULT_SOLD_STATUSES } from './constants';

const preferredMedia = db.$with("preferred_media").as(
  db
    .select({
      resourceRecordKey: mlsMedia.resourceRecordKey,
      mediaId: mlsMedia.mediaId,

      rn: sql<number>`
        row_number() over (
          partition by ${mlsMedia.resourceRecordKey}
          order by ${mlsMedia.order} asc nulls last
        )
      `.as("rn"),
    })
    .from(mlsMedia)
    .where(
      and(
        eq(mlsMedia.preferredPhotoYN, true),
        isNull(mlsMedia.deletedAt),
      )
    )
);

const preferredMediaFiltered = db.$with("preferred_media_filtered").as(
  db
    .select()
    .from(preferredMedia)
    .where(sql`rn = 1`)
);

const variantPivot = db.$with("variant_pivot").as(
  db
    .select({
      mediaId: mediaVariants.mediaId,

      fullUrl: sql<string | null>`
        max(case when ${mediaVariants.variantName} = 'full' then ${mediaVariants.url} end)
      `.as("fullUrl"),

      previewUrl: sql<string | null>`
        max(case when ${mediaVariants.variantName} = 'preview' then ${mediaVariants.url} end)
      `.as("previewUrl"),

      thumbnailUrl: sql<string | null>`
        max(case when ${mediaVariants.variantName} = 'thumbnail' then ${mediaVariants.url} end)
      `.as("thumbnailUrl"),
    })
    .from(mediaVariants)
    .groupBy(mediaVariants.mediaId)
);

const whereClauseFilters = ({ officeIds, memberIds, statuses }: {
  /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
  officeIds?: Placeholder<"officeIds", string[] | undefined>;
  /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
  memberIds?: Placeholder<"memberIds", string[] | undefined>;
  /** Property statuses to filter by. */
  statuses?: Placeholder<"statuses", StandardStatus[] | undefined>;
}) => {
  const conditions: SQL[] = [
    eq(properties.mlgCanView, true),
    isNull(properties.deletedAt),
  ];

  if (statuses?.protected?.length) conditions.push(inArray(properties.standardStatus, statuses))

  const orConditions: SQL[] = [];

  if (officeIds?.protected?.length) {
    orConditions.push(sql`
    ARRAY[
      ${properties.listOfficeMlsId},
      ${properties.coListOfficeMlsId},
      ${properties.buyerOfficeMlsId},
      ${properties.coBuyerOfficeMlsId}
    ] && ${officeIds}
  `);
  }

  if (memberIds?.protected?.length) {
    orConditions.push(sql`
    ARRAY[
      ${properties.listAgentMlsId},
      ${properties.coListAgentMlsId},
      ${properties.buyerAgentMlsId},
      ${properties.coBuyerAgentMlsId}
    ] && ${memberIds}
  `);
  }

  const orClause =
    orConditions.length > 0 ? or(...orConditions) : undefined;

  if (orClause) {
    conditions.push(orClause);
  }

  return and(...conditions);
}

const getPropertiesPrepared = db
  .with(preferredMedia, preferredMediaFiltered, variantPivot)
  .select({
    listingId: properties.listingId,
    listingKey: properties.listingKey,

    livingArea: properties.livingArea,
    livingAreaUnits: properties.livingAreaUnits,

    bathroomsFull: properties.bathroomsFull,
    bathroomsHalf: properties.bathroomsHalf,
    bathroomsThreeQuarter: properties.bathroomsThreeQuarter,

    bedroomsTotal: properties.bedroomsTotal,
    buildingAreaTotal: properties.buildingAreaTotal,

    featuredListingYN: properties.featuredListingYN,
    internetAddressDisplayYN: properties.internetAddressDisplayYN,
    internetAutomatedValuationDisplayYN:
      properties.internetAutomatedValuationDisplayYN,

    levels: properties.levels,
    latitude: properties.latitude,
    longitude: properties.longitude,
    listPrice: properties.listPrice,

    propertySubType: properties.propertySubType,
    propertyType: properties.propertyType,
    standardStatus: properties.standardStatus,

    streetDirPrefix: properties.streetDirPrefix,
    streetDirSuffix: properties.streetDirSuffix,
    streetName: properties.streetName,
    streetNumber: properties.streetNumber,
    streetSuffix: properties.streetSuffix,
    unitNumber: properties.unitNumber,

    city: properties.city,
    postalCode: properties.postalCode,
    stateOrProvince: properties.stateOrProvince,
    unparsedAddress: properties.unparsedAddress,

    yearBuilt: properties.yearBuilt,

    listAgentFullName: properties.listAgentFullName,
    listOfficeName: properties.listOfficeName,

    memberFullName: properties.listAgentFullName,
    officeName: properties.listOfficeName,

    onMarketDate: properties.onMarketDate,
    modificationTimestamp: properties.modificationTimestamp,

    // ONLY base media reference
    mediaId: preferredMediaFiltered.mediaId,

    primaryPhotoFullUrl: variantPivot.fullUrl,
    primaryPhotoPreviewUrl: variantPivot.previewUrl,
    primaryPhotoThumbnailUrl: variantPivot.thumbnailUrl,

    primaryPhotoUrl: sql<string | null>`
        coalesce(
          ${variantPivot.fullUrl},
          ${variantPivot.previewUrl},
          ${variantPivot.thumbnailUrl}
        )
      `.as("primaryPhotoUrl"),

    NWM: sql<TPropertyNwmFlags>`
        jsonb_build_object(
          'NWM_IDXMustRemovePrimaryPhotoYN',
          ${properties.NWM}->>'NWM_IDXMustRemovePrimaryPhotoYN',

          'NWM_IDXMustRemovePhotosYN',
          ${properties.NWM}->>'NWM_IDXMustRemovePhotosYN',

          'NWM_ShowMapLink',
          ${properties.NWM}->>'NWM_ShowMapLink',

          'NWM_StyleCode',
          ${properties.NWM}->>'NWM_StyleCode'
        )
      `.as("NWM"),
  })
  .from(properties)
  .where(whereClauseFilters({ officeIds: sql.placeholder("officeIds"), memberIds: sql.placeholder("memberIds"), statuses: sql.placeholder("statuses") }))
  .leftJoin(
    preferredMediaFiltered,
    eq(preferredMediaFiltered.resourceRecordKey, properties.listingKey)
  )
  .leftJoin(
    variantPivot,
    eq(variantPivot.mediaId, preferredMediaFiltered.mediaId)
  )
  .prepare("get_properties");


export async function getAvailableProperties(
  { officeIds, memberIds }: {
    /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
    officeIds?: string[];
    /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
    memberIds?: string[];
  }
): Promise<TPropertyCard[]> {
  return getPropertiesPrepared.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
    statuses: [...DEFAULT_ACTIVE_STATUSES],
  });
}

export async function getPendingProperties(
  { officeIds, memberIds }: {
    /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
    officeIds?: string[];
    /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
    memberIds?: string[];
  }
): Promise<TPropertyCard[]> {
  return getPropertiesPrepared.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
    statuses: [...DEFAULT_PENDING_STATUSES],
  });
}

export async function getSoldProperties(
  { officeIds, memberIds }: {
    /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
    officeIds?: string[];
    /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
    memberIds?: string[];
  }
): Promise<TPropertyCard[]> {
  return getPropertiesPrepared.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
    statuses: [...DEFAULT_SOLD_STATUSES],
  });
}

export async function getFeaturedProperties(
  { officeIds, memberIds }: {
    /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
    officeIds?: string[];
    /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
    memberIds?: string[];
  }
): Promise<TPropertyCard[]> {
  return getPropertiesPrepared.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
    statuses: [...DEFAULT_FEATURED_STATUSES],
  });
}