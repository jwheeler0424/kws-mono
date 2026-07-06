import type { PropertyListing, TPropertyNwmFlags } from '@kws/types';

import { type TMlsMedia } from '@kws/schema';
import { tsquery } from '@kws/schema/plugins';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/database';
import type { PropertySearchMarker } from '../data/columns';
import { DEFAULT_ACTIVE_STATUSES } from './constants';

export type TPropertyWithMedia = Omit<PropertyListing, 'NWM'> & {
  NWM: TPropertyNwmFlags | null;
  media: TMlsMedia[];
};

export async function getListingDetailByKey({
  listingKey,
}: {
  listingKey: string;
}): Promise<TPropertyWithMedia | null> {
  const [listing, media] = await Promise.all([
    db.query.properties.findFirst({
      columns: {
        NWM: false,
      },
      extras: {
        NWM: (table) => sql<TPropertyNwmFlags>`jsonb_build_object(
          'NWM_IDXMustRemovePrimaryPhotoYN', ${table.NWM}->>'NWM_IDXMustRemovePrimaryPhotoYN',
          'NWM_IDXMustRemovePhotosYN', ${table.NWM}->>'NWM_IDXMustRemovePhotosYN',
          'NWM_ShowMapLink', ${table.NWM}->>'NWM_ShowMapLink',
          'NWM_StyleCode', ${table.NWM}->>'NWM_StyleCode'
        )`,
      },
      where: {
        listingKey,
      },
    }),
    db.query.mlsMedia.findMany({
      columns: {
        mediaURL: false,
      },
      where: {
        resourceRecordKey: listingKey,
      },
      with: {
        media: {
          with: {
            variants: {
              columns: {
                url: true,
              },
              where: {
                variantName: 'full',
              },
              limit: 1,
            },
          },
        },
      },
      orderBy: (media, { desc }) => [desc(media.preferredPhotoYN), media.order],
    }),
  ]);

  const mediaWithUrl: TMlsMedia[] = media.map((m) => ({
    ...m,
    mediaURL: m.media?.variants?.[0]?.url ?? null,
  }));

  return listing ? { ...listing, media: mediaWithUrl } : null;
}

export async function getListingMarkers() {
  const markers = await db.query.properties.findMany({
    columns: {
      listingKey: true,
    },
  });

  return markers;
}

const listingsForSearchAndFilterColumns = {
  listingKey: true,
  listPrice: true,
  bedroomsTotal: true,
  bathroomsTotalInteger: true,
  livingArea: true,
  latitude: true,
  longitude: true,
} as const;

const listingsForSearchAndFilterBaseWhere = {
  mlgCanView: true,
  deletedAt: {
    isNull: true,
  },
  standardStatus: {
    in: DEFAULT_ACTIVE_STATUSES,
  },
  latitude: {
    isNotNull: true,
  },
  longitude: {
    isNotNull: true,
  },
} as const;

const listingsSearchQuery = tsquery(sql`${sql.placeholder('query')}`, {
  mode: 'websearch',
  language: 'english',
});

const preparedListingsForFilter = db.query.properties
  .findMany({
    columns: listingsForSearchAndFilterColumns,
    where: listingsForSearchAndFilterBaseWhere,
  })
  .prepare('get_listings_for_filter');

const preparedListingsForSearchAndFilter = db.query.properties
  .findMany({
    columns: listingsForSearchAndFilterColumns,
    extras: {
      rank: (table) => listingsSearchQuery.rankSimple(table.searchVector),
    },
    where: {
      ...listingsForSearchAndFilterBaseWhere,
      RAW: (table) => listingsSearchQuery.match(table.searchVector),
    },
    orderBy: (table) => [
      sql`${listingsSearchQuery.rankSimple(table.searchVector)} DESC`,
      table.listingKey,
    ],
  })
  .prepare('get_listings_for_search_and_filter');

export async function getListingsForSearchAndFilter(query?: string): Promise<PropertySearchMarker[]> {
  const normalizedQuery = query?.trim();

  const listings = normalizedQuery
    ? await preparedListingsForSearchAndFilter.execute({ query: normalizedQuery })
    : await preparedListingsForFilter.execute();

  return listings;
}
