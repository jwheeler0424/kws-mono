import type { TPropertyCard, TPropertyNwmFlags } from '@kws/types';

import { sql } from 'drizzle-orm';

import { db } from '@/lib/database';

import {
  DEFAULT_ACTIVE_STATUSES,
  DEFAULT_FEATURED_STATUSES,
  DEFAULT_PENDING_STATUSES,
  DEFAULT_SOLD_STATUSES,
} from './constants';

type TPropertyFindManyConfig = NonNullable<Parameters<typeof db.query.properties.findMany>[0]>;
type TPropertyCardQueryConfig = Pick<TPropertyFindManyConfig, 'columns' | 'extras' | 'with'>;

export const propertyCardColumns = {
  listingId: true,
  listingKey: true,

  livingArea: true,
  livingAreaUnits: true,

  bathroomsFull: true,
  bathroomsHalf: true,
  bathroomsThreeQuarter: true,

  bedroomsTotal: true,
  buildingAreaTotal: true,

  featuredListingYN: true,
  internetAddressDisplayYN: true,
  internetAutomatedValuationDisplayYN: true,

  levels: true,
  latitude: true,
  longitude: true,
  listPrice: true,

  propertySubType: true,
  propertyType: true,
  standardStatus: true,

  streetDirPrefix: true,
  streetDirSuffix: true,
  streetName: true,
  streetNumber: true,
  streetSuffix: true,
  unitNumber: true,

  city: true,
  postalCode: true,
  stateOrProvince: true,
  unparsedAddress: true,

  yearBuilt: true,
} as const;

export const getPropertyCardQueryConfig = (): TPropertyCardQueryConfig => ({
  columns: propertyCardColumns,
  extras: {
    memberFullName: (table) => sql<string | null>`${table.listAgentFullName}`,
    officeName: (table) => sql<string | null>`${table.listOfficeName}`,
    NWM: (table) => sql<TPropertyNwmFlags>`
        jsonb_build_object(
          'NWM_IDXMustRemovePrimaryPhotoYN',
          ${table.NWM}->>'NWM_IDXMustRemovePrimaryPhotoYN',

          'NWM_IDXMustRemovePhotosYN',
          ${table.NWM}->>'NWM_IDXMustRemovePhotosYN',

          'NWM_ShowMapLink',
          ${table.NWM}->>'NWM_ShowMapLink',

          'NWM_StyleCode',
          ${table.NWM}->>'NWM_StyleCode'
        )
      `,
  },
  with: {
    media: {
      limit: 1,
      where: {
        preferredPhotoYN: true,
        deletedAt: { isNull: true as const },
      },
      with: {
        media: {
          with: {
            variants: {
              where: {
                variantName: { in: ['full', 'preview', 'thumbnail'] },
              },
            },
          },
        },
      },
    },
  },
});

export type TPropertyCardRow = Awaited<ReturnType<typeof db.query.properties.findMany>>[number] & {
  memberFullName: string | null;
  officeName: string | null;
  NWM: TPropertyNwmFlags;
  media: Array<{ media: { variants: Array<{ variantName: string; url: string }> } | null }>;
};

export const formatPropertyCardData = (property: TPropertyCardRow): TPropertyCard => {
  const { NWM, media, ...rest } = property;
  const primaryMedia = media?.[0]?.media;
  let fullUrl: string | null = null;
  let previewUrl: string | null = null;
  let thumbnailUrl: string | null = null;

  for (const variant of primaryMedia?.variants ?? []) {
    if (variant.variantName === 'full') {
      fullUrl = variant.url;
      continue;
    }

    if (variant.variantName === 'preview') {
      previewUrl = variant.url;
      continue;
    }

    if (variant.variantName === 'thumbnail') {
      thumbnailUrl = variant.url;
    }
  }

  return {
    ...rest,
    ...NWM,
    primaryPhotoFullUrl: fullUrl,
    primaryPhotoPreviewUrl: previewUrl,
    primaryPhotoThumbnailUrl: thumbnailUrl,
    primaryPhotoUrl: fullUrl ?? previewUrl ?? thumbnailUrl,
  };
};

const preparedIndividualProperty = db.query.properties
  .findFirst({
    ...getPropertyCardQueryConfig(),
    where: {
      listingKey: sql.placeholder('listingKey'),
    },
  })
  .prepare('get_individual_property');

const preparedActiveProperties = db.query.properties
  .findMany({
    ...getPropertyCardQueryConfig(),
    where: {
      AND: [
        {
          mlgCanView: true,
          deletedAt: { isNull: true },
          standardStatus: { in: [...DEFAULT_ACTIVE_STATUSES] },
        },
        {
          RAW: (table) => sql`(
          ${table.listOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.coListOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.buyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.coBuyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.listAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.coListAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.buyerAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.coBuyerAgentMlsId} = ANY(${sql.placeholder('memberIds')})
        )`,
        },
      ],
    },
  })
  .prepare('get_active_properties');

const preparedPendingProperties = db.query.properties
  .findMany({
    ...getPropertyCardQueryConfig(),
    where: {
      AND: [
        {
          mlgCanView: true,
          deletedAt: { isNull: true },
          standardStatus: { in: [...DEFAULT_PENDING_STATUSES] },
        },
        {
          RAW: (table) => sql`(
          ${table.listOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.coListOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.buyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.coBuyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.listAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.coListAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.buyerAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.coBuyerAgentMlsId} = ANY(${sql.placeholder('memberIds')})
        )`,
        },
      ],
    },
  })
  .prepare('get_pending_properties');

const preparedSoldProperties = db.query.properties
  .findMany({
    ...getPropertyCardQueryConfig(),
    where: {
      AND: [
        {
          mlgCanView: true,
          deletedAt: { isNull: true },
          standardStatus: { in: [...DEFAULT_SOLD_STATUSES] },
        },
        {
          RAW: (table) => sql`(
          ${table.listOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.coListOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.buyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.coBuyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
          ${table.listAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.coListAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.buyerAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
          ${table.coBuyerAgentMlsId} = ANY(${sql.placeholder('memberIds')})
        )`,
        },
      ],
    },
  })
  .prepare('get_sold_properties');

const preparedFeaturedProperties = db.query.properties
  .findMany({
    ...getPropertyCardQueryConfig(),
    where: {
      OR: [
        {
          featuredListingYN: true,
          mlgCanView: true,
          deletedAt: { isNull: true },
          standardStatus: { in: [...DEFAULT_FEATURED_STATUSES] },
        },
        {
          AND: [
            {
              mlgCanView: true,
              deletedAt: { isNull: true },
              standardStatus: { in: [...DEFAULT_FEATURED_STATUSES] },
            },
            {
              RAW: (table) => sql`(
              ${table.listOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
              ${table.coListOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
              ${table.buyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
              ${table.coBuyerOfficeMlsId} = ANY(${sql.placeholder('officeIds')}) OR
              ${table.listAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
              ${table.coListAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
              ${table.buyerAgentMlsId} = ANY(${sql.placeholder('memberIds')}) OR
              ${table.coBuyerAgentMlsId} = ANY(${sql.placeholder('memberIds')})
            )`,
            },
          ],
        },
      ],
    },
  })
  .prepare('get_featured_properties');

export async function getPropertyByListingKey({
  listingKey,
}: {
  /** Listing key to filter by. */
  listingKey: string;
}): Promise<TPropertyCard | null> {
  if (!listingKey) return null;

  const result = await preparedIndividualProperty.execute({
    listingKey,
  });

  return result ? formatPropertyCardData(result as TPropertyCardRow) : null;
}

export async function getAvailableProperties({
  officeIds,
  memberIds,
}: {
  /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
  officeIds?: string[];
  /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
  memberIds?: string[];
}): Promise<TPropertyCard[]> {
  if (!officeIds?.length && !memberIds?.length) return [];

  const results = await preparedActiveProperties.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
  });

  return results.map((row) => formatPropertyCardData(row as TPropertyCardRow));
}

export async function getPendingProperties({
  officeIds,
  memberIds,
}: {
  /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
  officeIds?: string[];
  /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
  memberIds?: string[];
}): Promise<TPropertyCard[]> {
  if (!officeIds?.length && !memberIds?.length) return [];

  const results = await preparedPendingProperties.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
  });

  return results.map((row) => formatPropertyCardData(row as TPropertyCardRow));
}

export async function getSoldProperties({
  officeIds,
  memberIds,
}: {
  /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
  officeIds?: string[];
  /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
  memberIds?: string[];
}): Promise<TPropertyCard[]> {
  if (!officeIds?.length && !memberIds?.length) return [];

  const results = await preparedSoldProperties.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
  });

  return results.map((row) => formatPropertyCardData(row as TPropertyCardRow));
}

export async function getFeaturedProperties({
  officeIds,
  memberIds,
}: {
  /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
  officeIds?: string[];
  /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
  memberIds?: string[];
}): Promise<TPropertyCard[]> {
  const results = await preparedFeaturedProperties.execute({
    officeIds: officeIds ?? [],
    memberIds: memberIds ?? [],
  });

  return results.map((row) => formatPropertyCardData(row as TPropertyCardRow));
}
