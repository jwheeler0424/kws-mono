import type {
  CursorResult,
  PropertyListing,
  PropertySearchMarker,
  TListingsSearch,
  TPropertyCard,
  TPropertyNwmFlags,
} from '@kws/types';

import { type TMlsMedia } from '@kws/schema';
import { tsquery } from '@kws/schema/plugins';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '@/lib/database';
import { getNearMeCells, H3_RES } from '@/lib/h3';
import { getRedisClient } from '@/lib/redis';
import { DEFAULT_ACTIVE_STATUSES } from './constants';
import { formatPropertyCardData, getPropertyCardQueryConfig, type TPropertyCardRow } from './properties';

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


const listingsForSearchAndFilterColumns = {
  id: true,
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

const limitPlaceholder = sql.placeholder('limit');
const priceMinPlaceholder = sql.placeholder('priceMin');
const priceMaxPlaceholder = sql.placeholder('priceMax');
const sqFtMinPlaceholder = sql.placeholder('sqFtMin');
const sqFtMaxPlaceholder = sql.placeholder('sqFtMax');
const bedroomsMinPlaceholder = sql.placeholder('bedroomsMin');
const bedroomsMaxPlaceholder = sql.placeholder('bedroomsMax');
const bathroomsMinPlaceholder = sql.placeholder('bathroomsMin');
const bathroomsMaxPlaceholder = sql.placeholder('bathroomsMax');
const useMapBoundsPlaceholder = sql.placeholder('useMapBounds');
const boundsNorthEastLatPlaceholder = sql.placeholder('boundsNorthEastLat');
const boundsNorthEastLngPlaceholder = sql.placeholder('boundsNorthEastLng');
const boundsSouthWestLatPlaceholder = sql.placeholder('boundsSouthWestLat');
const boundsSouthWestLngPlaceholder = sql.placeholder('boundsSouthWestLng');
const proximityLatPlaceholder = sql.placeholder('proximityLat');
const proximityLngPlaceholder = sql.placeholder('proximityLng');
const proximityRadiusMilesPlaceholder = sql.placeholder('proximityRadiusMiles');
const proximityH3ResolutionPlaceholder = sql.placeholder('proximityH3Resolution');
const proximityH3CellsPlaceholder = sql.placeholder('proximityH3Cells');
const rangeMinPlaceholder = sql.placeholder('rangeMin');
const rangeMaxPlaceholder = sql.placeholder('rangeMax');

type ListingsSortBy = NonNullable<TListingsSearch['sortBy']>;

type ListingsSearchInput = Partial<TListingsSearch> | undefined;

type ListingsPreparedParams = {
  limit?: number;
  priceMin: number | null;
  priceMax: number | null;
  sqFtMin: number | null;
  sqFtMax: number | null;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  bathroomsMin: number | null;
  bathroomsMax: number | null;
  useMapBounds: boolean;
  boundsNorthEastLat: number | null;
  boundsNorthEastLng: number | null;
  boundsSouthWestLat: number | null;
  boundsSouthWestLng: number | null;
  proximityLat: number | null;
  proximityLng: number | null;
  proximityRadiusMiles: number | null;
  proximityH3Resolution: number | null;
  proximityH3Cells: string[] | null;
};

type ListingsNoFilterParams = {
  limit?: number;
};

type ListingsRangeNumericParams = {
  limit?: number;
  rangeMin: number;
  rangeMax: number;
};

type ListingsRangeIntegerParams = {
  limit?: number;
  rangeMin: number;
  rangeMax: number;
};

type ListingsSearchSessionMeta = {
  createdAt: number;
  total: number;
  expiresAt: number;
};

type ListingsSearchSessionLegacy = ListingsSearchSessionMeta & {
  ids: Array<PropertySearchMarker['id']>;
};

export type ListingsSearchWithSessionResult = {
  sessionId: string;
  total: number;
  markers: PropertySearchMarker[];
};

type HydratedListingsCachePage = CursorResult<TPropertyCard>;

const LISTINGS_SEARCH_SESSION_TTL_MS = 10 * 60 * 1000;
const LISTINGS_SEARCH_SESSION_TTL_SECONDS = Math.max(
  1,
  Math.floor(LISTINGS_SEARCH_SESSION_TTL_MS / 1000),
);
const LISTINGS_SEARCH_SESSION_KEY_PREFIX = 'mls:listings:search:session:';
const LISTINGS_BASELINE_CACHE_TTL_MS = 5 * 60 * 1000;
const LISTINGS_BASELINE_CACHE_TTL_SECONDS = Math.max(
  1,
  Math.floor(LISTINGS_BASELINE_CACHE_TTL_MS / 1000),
);
const LISTINGS_MARKERS_CACHE_KEY = 'mls:listings:markers';

function parseCachedBaselineMarkers(raw: string): PropertySearchMarker[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as PropertySearchMarker[];
  } catch {
    return null;
  }
}

async function getCachedBaselineMarkers(): Promise<PropertySearchMarker[] | null> {
  const client = await getRedisClient();
  const raw = await client.get(LISTINGS_MARKERS_CACHE_KEY);
  if (!raw) {
    return null;
  }

  return parseCachedBaselineMarkers(raw);
}

async function setCachedBaselineMarkers(markers: PropertySearchMarker[]): Promise<void> {
  const client = await getRedisClient();
  await client.set(LISTINGS_MARKERS_CACHE_KEY, JSON.stringify(markers), {
    EX: LISTINGS_BASELINE_CACHE_TTL_SECONDS,
  });
}

function getListingsSearchSessionKey(sessionId: string): string {
  return `${LISTINGS_SEARCH_SESSION_KEY_PREFIX}${sessionId}`;
}

function getListingsSearchSessionIdsKey(sessionId: string): string {
  return `${getListingsSearchSessionKey(sessionId)}:ids`;
}

function getHydratedListingsCacheKey(sessionId: string, offset: number, limit: number): string {
  return `${getListingsSearchSessionKey(sessionId)}:hydrated:${offset}:${limit}`;
}

function parseHydratedListingsCachePage(raw: string): HydratedListingsCachePage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<HydratedListingsCachePage>;
    if (!parsed || !Array.isArray(parsed.items)) {
      return null;
    }

    return {
      items: parsed.items as TPropertyCard[],
      nextCursor: typeof parsed.nextCursor === 'string' ? parsed.nextCursor : null,
      hasMore: parsed.hasMore === true,
    };
  } catch {
    return null;
  }
}

async function touchListingsSearchSession(sessionId: string): Promise<void> {
  const client = await getRedisClient();
  const sessionKey = getListingsSearchSessionKey(sessionId);
  const sessionIdsKey = getListingsSearchSessionIdsKey(sessionId);

  await Promise.all([
    typeof client.getEx === 'function'
      ? client.getEx(sessionKey, {
        EX: LISTINGS_SEARCH_SESSION_TTL_SECONDS,
      })
      : client.expire(sessionKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS),
    client.expire(sessionIdsKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS),
  ]);
}

async function getCachedHydratedListingsPage(
  sessionId: string,
  offset: number,
  limit: number,
): Promise<HydratedListingsCachePage | null> {
  const client = await getRedisClient();
  const cacheKey = getHydratedListingsCacheKey(sessionId, offset, limit);
  const raw = await client.get(cacheKey);
  if (!raw) {
    return null;
  }

  await Promise.all([
    client.expire(cacheKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS),
    touchListingsSearchSession(sessionId),
  ]);

  return parseHydratedListingsCachePage(raw);
}

async function setCachedHydratedListingsPage(
  sessionId: string,
  offset: number,
  limit: number,
  page: HydratedListingsCachePage,
): Promise<void> {
  const client = await getRedisClient();
  await client.set(getHydratedListingsCacheKey(sessionId, offset, limit), JSON.stringify(page), {
    EX: LISTINGS_SEARCH_SESSION_TTL_SECONDS,
  });
}

function parseListingsSearchSessionMeta(raw: string): ListingsSearchSessionMeta | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ListingsSearchSessionMeta>;
    if (!parsed) {
      return null;
    }

    return {
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
      total:
        typeof parsed.total === 'number' && Number.isFinite(parsed.total)
          ? parsed.total
          : 0,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function parseListingsSearchSessionLegacy(raw: string): ListingsSearchSessionLegacy | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ListingsSearchSessionLegacy>;
    if (!parsed || !Array.isArray(parsed.ids)) {
      return null;
    }

    return {
      ids: parsed.ids.filter((id): id is PropertySearchMarker['id'] => typeof id === 'string'),
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
      total:
        typeof parsed.total === 'number' && Number.isFinite(parsed.total)
          ? parsed.total
          : parsed.ids.length,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : Date.now(),
    };
  } catch {
    return null;
  }
}

async function createListingsSearchSession(
  markers: PropertySearchMarker[],
): Promise<{ sessionId: string; total: number }> {
  const now = Date.now();
  const ids = markers.map((marker) => marker.id);

  const sessionId = randomUUID();
  const session: ListingsSearchSessionMeta = {
    createdAt: now,
    total: ids.length,
    expiresAt: now + LISTINGS_SEARCH_SESSION_TTL_MS,
  };

  const client = await getRedisClient();
  const sessionKey = getListingsSearchSessionKey(sessionId);
  const sessionIdsKey = getListingsSearchSessionIdsKey(sessionId);
  const tx = client.multi();

  tx.set(sessionKey, JSON.stringify(session), {
    EX: LISTINGS_SEARCH_SESSION_TTL_SECONDS,
  });

  tx.del(sessionIdsKey);
  if (ids.length > 0) {
    tx.rPush(sessionIdsKey, ids);
    tx.expire(sessionIdsKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS);
  }

  await tx.exec();

  return {
    sessionId,
    total: session.total,
  };
}

async function getListingsSearchSessionPage(
  sessionId: string,
  offset: number,
  pageSize: number,
): Promise<{ ids: Array<PropertySearchMarker['id']>; total: number } | null> {
  if (!sessionId) {
    return null;
  }

  const client = await getRedisClient();
  const sessionKey = getListingsSearchSessionKey(sessionId);
  const sessionIdsKey = getListingsSearchSessionIdsKey(sessionId);
  const sessionRaw = await client.get(sessionKey);
  if (!sessionRaw) {
    return null;
  }

  const sessionMeta = parseListingsSearchSessionMeta(sessionRaw);
  if (sessionMeta) {
    if (sessionMeta.total <= 0) {
      if (typeof client.getEx === 'function') {
        await client.getEx(sessionKey, {
          EX: LISTINGS_SEARCH_SESSION_TTL_SECONDS,
        });
      } else {
        await client.expire(sessionKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS);
      }

      return {
        ids: [],
        total: 0,
      };
    }

    const start = Math.max(0, offset);
    const stop = Math.max(start, start + pageSize - 1);
    const [rawIds] = await Promise.all([
      client.lRange(sessionIdsKey, start, stop),
      client.expire(sessionIdsKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS),
      typeof client.getEx === 'function'
        ? client.getEx(sessionKey, {
          EX: LISTINGS_SEARCH_SESSION_TTL_SECONDS,
        })
        : client.expire(sessionKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS),
    ]);

    const ids = rawIds.filter(
      (id): id is PropertySearchMarker['id'] => typeof id === 'string',
    );

    if (!ids.length && start < sessionMeta.total) {
      return null;
    }

    return {
      ids,
      total: sessionMeta.total,
    };
  }

  // Legacy session fallback (single JSON payload containing all IDs).
  const legacySession = parseListingsSearchSessionLegacy(sessionRaw);
  if (!legacySession) {
    return null;
  }

  if (typeof client.getEx === 'function') {
    await client.getEx(sessionKey, {
      EX: LISTINGS_SEARCH_SESSION_TTL_SECONDS,
    });
  } else {
    await client.expire(sessionKey, LISTINGS_SEARCH_SESSION_TTL_SECONDS);
  }

  return {
    ids: legacySession.ids.slice(offset, offset + pageSize),
    total: legacySession.total,
  };
}

const buildProximityH3Params = (
  proximity: TListingsSearch['proximity'] | null | undefined,
): Pick<ListingsPreparedParams, 'proximityH3Resolution' | 'proximityH3Cells'> => {
  const base = {
    proximityH3Resolution: null,
    proximityH3Cells: null,
  } satisfies Pick<ListingsPreparedParams, 'proximityH3Resolution' | 'proximityH3Cells'>;

  if (
    proximity?.lat === null ||
    proximity?.lat === undefined ||
    proximity?.lng === null ||
    proximity?.lng === undefined ||
    proximity?.radiusMiles === null ||
    proximity?.radiusMiles === undefined
  ) {
    return base;
  }

  const proximityCells = getNearMeCells(proximity.lat, proximity.lng, proximity.radiusMiles);

  return {
    ...base,
    proximityH3Resolution: proximityCells.resolution,
    proximityH3Cells: proximityCells.cells,
  };
};

const proximityDistanceMilesSql = (table: {
  latitude: unknown;
  longitude: unknown;
}) => sql<number>`3959 * acos(
  least(
    1,
    greatest(
      -1,
      cos(radians(${proximityLatPlaceholder}))
        * cos(radians(${table.latitude}))
        * cos(radians(${table.longitude}) - radians(${proximityLngPlaceholder}))
        + sin(radians(${proximityLatPlaceholder})) * sin(radians(${table.latitude}))
    )
  )
)`;

const listingsFiltersSql = (table: {
  listPrice: unknown;
  livingArea: unknown;
  bedroomsTotal: unknown;
  bathroomsTotalInteger: unknown;
  latitude: unknown;
  longitude: unknown;
  h3R6: unknown;
  h3R7: unknown;
  h3R8: unknown;
}) => sql`
  (${priceMinPlaceholder}::numeric is null OR ${table.listPrice} >= ${priceMinPlaceholder}::numeric)
  AND (${priceMaxPlaceholder}::numeric is null OR ${table.listPrice} <= ${priceMaxPlaceholder}::numeric)
  AND (${sqFtMinPlaceholder}::numeric is null OR ${table.livingArea} >= ${sqFtMinPlaceholder}::numeric)
  AND (${sqFtMaxPlaceholder}::numeric is null OR ${table.livingArea} <= ${sqFtMaxPlaceholder}::numeric)
  AND (${bedroomsMinPlaceholder}::integer is null OR ${table.bedroomsTotal} >= ${bedroomsMinPlaceholder}::integer)
  AND (${bedroomsMaxPlaceholder}::integer is null OR ${table.bedroomsTotal} <= ${bedroomsMaxPlaceholder}::integer)
  AND (${bathroomsMinPlaceholder}::integer is null OR ${table.bathroomsTotalInteger} >= ${bathroomsMinPlaceholder}::integer)
  AND (${bathroomsMaxPlaceholder}::integer is null OR ${table.bathroomsTotalInteger} <= ${bathroomsMaxPlaceholder}::integer)
  AND (
    ${useMapBoundsPlaceholder}::boolean is not true
    OR ${boundsNorthEastLatPlaceholder}::double precision is null
    OR ${boundsNorthEastLngPlaceholder}::double precision is null
    OR ${boundsSouthWestLatPlaceholder}::double precision is null
    OR ${boundsSouthWestLngPlaceholder}::double precision is null
    OR (
      ${table.latitude} BETWEEN ${boundsSouthWestLatPlaceholder}::double precision AND ${boundsNorthEastLatPlaceholder}::double precision
      AND ${table.longitude} BETWEEN ${boundsSouthWestLngPlaceholder}::double precision AND ${boundsNorthEastLngPlaceholder}::double precision
    )
  )
  AND (
    ${proximityLatPlaceholder}::double precision is null
    OR ${proximityLngPlaceholder}::double precision is null
    OR ${proximityRadiusMilesPlaceholder}::double precision is null
    OR (
      (
        ${proximityH3ResolutionPlaceholder}::integer is null
        OR ${proximityH3CellsPlaceholder}::text[] is null
        OR (
          (${proximityH3ResolutionPlaceholder}::integer = ${H3_RES.DISTRICT} AND ${table.h3R6} = any(${proximityH3CellsPlaceholder}::text[]))
          OR (${proximityH3ResolutionPlaceholder}::integer = ${H3_RES.NEIGHBORHOOD} AND ${table.h3R7} = any(${proximityH3CellsPlaceholder}::text[]))
          OR (${proximityH3ResolutionPlaceholder}::integer = ${H3_RES.BLOCK} AND ${table.h3R8} = any(${proximityH3CellsPlaceholder}::text[]))
        )
      )
      AND ${proximityDistanceMilesSql(table)} <= ${proximityRadiusMilesPlaceholder}::double precision
    )
  )
`;

const hasValue = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const hasDynamicListingsFilters = (source: ListingsSearchInput): boolean => {
  const hasPriceFilter = hasValue(source?.price?.min) || hasValue(source?.price?.max);
  const hasSqFtFilter = hasValue(source?.sqFt?.min) || hasValue(source?.sqFt?.max);
  const hasBedroomsFilter = hasValue(source?.bedrooms?.min) || hasValue(source?.bedrooms?.max);
  const hasBathroomsFilter = hasValue(source?.bathrooms?.min) || hasValue(source?.bathrooms?.max);

  const hasMapBoundsFilter =
    source?.useMapBounds === true &&
    source.bounds !== null &&
    source.bounds !== undefined &&
    hasValue(source.bounds.northEast?.lat) &&
    hasValue(source.bounds.northEast?.lng) &&
    hasValue(source.bounds.southWest?.lat) &&
    hasValue(source.bounds.southWest?.lng);

  const hasProximityFilter =
    hasValue(source?.proximity?.lat) &&
    hasValue(source?.proximity?.lng) &&
    hasValue(source?.proximity?.radiusMiles);

  return (
    hasPriceFilter ||
    hasSqFtFilter ||
    hasBedroomsFilter ||
    hasBathroomsFilter ||
    hasMapBoundsFilter ||
    hasProximityFilter
  );
};

const buildPreparedListingsNoFilterQuery = ({
  name,
  sortBy,
}: {
  name: string;
  sortBy: Exclude<ListingsSortBy, 'proximity'>;
}) =>
  db.query.properties
    .findMany({
      columns: listingsForSearchAndFilterColumns,
      where: listingsForSearchAndFilterBaseWhere,
      orderBy: (table, { asc, desc }) => {
        switch (sortBy) {
          case 'priceAsc':
            return [
              asc(table.listPrice),
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
          case 'priceDesc':
            return [
              desc(table.listPrice),
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
          case 'newest':
          default:
            return [
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
        }
      },
      limit: limitPlaceholder,
    })
    .prepare(name);

const buildPreparedListingsRangeQuery = ({
  name,
  sortBy,
  rangeSql,
}: {
  name: string;
  sortBy: Exclude<ListingsSortBy, 'proximity'>;
  rangeSql: (table: {
    listPrice: unknown;
    livingArea: unknown;
    bedroomsTotal: unknown;
    bathroomsTotalInteger: unknown;
  }) => ReturnType<typeof sql>;
}) =>
  db.query.properties
    .findMany({
      columns: listingsForSearchAndFilterColumns,
      where: {
        ...listingsForSearchAndFilterBaseWhere,
        RAW: (table) => rangeSql(table),
      },
      orderBy: (table, { asc, desc }) => {
        switch (sortBy) {
          case 'priceAsc':
            return [
              asc(table.listPrice),
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
          case 'priceDesc':
            return [
              desc(table.listPrice),
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
          case 'newest':
          default:
            return [
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
        }
      },
      limit: limitPlaceholder,
    })
    .prepare(name);

const preparedListingsLegacyNoSortNoLimit = db.query.properties
  .findMany({
    columns: listingsForSearchAndFilterColumns,
    where: listingsForSearchAndFilterBaseWhere,
  })
  .prepare('get_listings_legacy_no_sort_no_limit');

const preparedListingsLegacyNoSortWithLimit = db.query.properties
  .findMany({
    columns: listingsForSearchAndFilterColumns,
    where: listingsForSearchAndFilterBaseWhere,
    limit: limitPlaceholder,
  })
  .prepare('get_listings_legacy_no_sort_with_limit');

async function fetchAndCacheBaselineMarkers(): Promise<PropertySearchMarker[]> {
  const markers = await preparedListingsLegacyNoSortNoLimit.execute();
  await setCachedBaselineMarkers(markers);
  return markers;
}

// Prewarm baseline markers at module load so first external request is less likely
// to pay connection/plan/data cold-start latency.
void fetchAndCacheBaselineMarkers().catch(() => undefined);

const buildPreparedListingsQuery = ({
  name,
  includeSearch,
  sortBy,
}: {
  name: string;
  includeSearch: boolean;
  sortBy: ListingsSortBy;
}) =>
  db.query.properties
    .findMany({
      columns: listingsForSearchAndFilterColumns,
      where: {
        ...listingsForSearchAndFilterBaseWhere,
        RAW: (table) =>
          includeSearch
            ? sql`${listingsFiltersSql(table)} AND ${listingsSearchQuery.match(table.searchVector)}`
            : listingsFiltersSql(table),
      },
      orderBy: (table, { asc, desc }) => {
        switch (sortBy) {
          case 'priceAsc':
            return [
              asc(table.listPrice),
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
          case 'priceDesc':
            return [
              desc(table.listPrice),
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
          case 'proximity':
            return [
              sql`${proximityDistanceMilesSql(table)} asc`,
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
          case 'newest':
          default:
            return [
              desc(table.onMarketDate),
              desc(table.modificationTimestamp),
              desc(table.listingKey),
            ];
        }
      },
      limit: limitPlaceholder,
    })
    .prepare(name);

const preparedListingsQueryMap = {
  newest: {
    withSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_search_and_filter_newest',
      includeSearch: true,
      sortBy: 'newest',
    }),
    withoutSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_filter_newest',
      includeSearch: false,
      sortBy: 'newest',
    }),
    withoutSearchNoFilters: buildPreparedListingsNoFilterQuery({
      name: 'get_listings_for_no_filter_newest',
      sortBy: 'newest',
    }),
  },
  priceAsc: {
    withSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_search_and_filter_price_asc',
      includeSearch: true,
      sortBy: 'priceAsc',
    }),
    withoutSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_filter_price_asc',
      includeSearch: false,
      sortBy: 'priceAsc',
    }),
    withoutSearchNoFilters: buildPreparedListingsNoFilterQuery({
      name: 'get_listings_for_no_filter_price_asc',
      sortBy: 'priceAsc',
    }),
  },
  priceDesc: {
    withSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_search_and_filter_price_desc',
      includeSearch: true,
      sortBy: 'priceDesc',
    }),
    withoutSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_filter_price_desc',
      includeSearch: false,
      sortBy: 'priceDesc',
    }),
    withoutSearchNoFilters: buildPreparedListingsNoFilterQuery({
      name: 'get_listings_for_no_filter_price_desc',
      sortBy: 'priceDesc',
    }),
  },
  proximity: {
    withSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_search_and_filter_proximity',
      includeSearch: true,
      sortBy: 'proximity',
    }),
    withoutSearch: buildPreparedListingsQuery({
      name: 'get_listings_for_filter_proximity',
      includeSearch: false,
      sortBy: 'proximity',
    }),
    withoutSearchNoFilters: null,
  },
} as const;

const preparedListingsSqFtRangeQueryMap = {
  newest: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_sqft_range_newest',
    sortBy: 'newest',
    rangeSql: (table) =>
      sql`${table.livingArea} >= ${rangeMinPlaceholder}::numeric AND ${table.livingArea} <= ${rangeMaxPlaceholder}::numeric`,
  }),
  priceAsc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_sqft_range_price_asc',
    sortBy: 'priceAsc',
    rangeSql: (table) =>
      sql`${table.livingArea} >= ${rangeMinPlaceholder}::numeric AND ${table.livingArea} <= ${rangeMaxPlaceholder}::numeric`,
  }),
  priceDesc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_sqft_range_price_desc',
    sortBy: 'priceDesc',
    rangeSql: (table) =>
      sql`${table.livingArea} >= ${rangeMinPlaceholder}::numeric AND ${table.livingArea} <= ${rangeMaxPlaceholder}::numeric`,
  }),
} as const;

const preparedListingsPriceRangeQueryMap = {
  newest: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_price_range_newest',
    sortBy: 'newest',
    rangeSql: (table) =>
      sql`${table.listPrice} >= ${rangeMinPlaceholder}::numeric AND ${table.listPrice} <= ${rangeMaxPlaceholder}::numeric`,
  }),
  priceAsc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_price_range_price_asc',
    sortBy: 'priceAsc',
    rangeSql: (table) =>
      sql`${table.listPrice} >= ${rangeMinPlaceholder}::numeric AND ${table.listPrice} <= ${rangeMaxPlaceholder}::numeric`,
  }),
  priceDesc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_price_range_price_desc',
    sortBy: 'priceDesc',
    rangeSql: (table) =>
      sql`${table.listPrice} >= ${rangeMinPlaceholder}::numeric AND ${table.listPrice} <= ${rangeMaxPlaceholder}::numeric`,
  }),
} as const;

const preparedListingsBedroomsRangeQueryMap = {
  newest: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_bedrooms_range_newest',
    sortBy: 'newest',
    rangeSql: (table) =>
      sql`${table.bedroomsTotal} >= ${rangeMinPlaceholder}::integer AND ${table.bedroomsTotal} <= ${rangeMaxPlaceholder}::integer`,
  }),
  priceAsc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_bedrooms_range_price_asc',
    sortBy: 'priceAsc',
    rangeSql: (table) =>
      sql`${table.bedroomsTotal} >= ${rangeMinPlaceholder}::integer AND ${table.bedroomsTotal} <= ${rangeMaxPlaceholder}::integer`,
  }),
  priceDesc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_bedrooms_range_price_desc',
    sortBy: 'priceDesc',
    rangeSql: (table) =>
      sql`${table.bedroomsTotal} >= ${rangeMinPlaceholder}::integer AND ${table.bedroomsTotal} <= ${rangeMaxPlaceholder}::integer`,
  }),
} as const;

const preparedListingsBathroomsRangeQueryMap = {
  newest: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_bathrooms_range_newest',
    sortBy: 'newest',
    rangeSql: (table) =>
      sql`${table.bathroomsTotalInteger} >= ${rangeMinPlaceholder}::integer AND ${table.bathroomsTotalInteger} <= ${rangeMaxPlaceholder}::integer`,
  }),
  priceAsc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_bathrooms_range_price_asc',
    sortBy: 'priceAsc',
    rangeSql: (table) =>
      sql`${table.bathroomsTotalInteger} >= ${rangeMinPlaceholder}::integer AND ${table.bathroomsTotalInteger} <= ${rangeMaxPlaceholder}::integer`,
  }),
  priceDesc: buildPreparedListingsRangeQuery({
    name: 'get_listings_for_bathrooms_range_price_desc',
    sortBy: 'priceDesc',
    rangeSql: (table) =>
      sql`${table.bathroomsTotalInteger} >= ${rangeMinPlaceholder}::integer AND ${table.bathroomsTotalInteger} <= ${rangeMaxPlaceholder}::integer`,
  }),
} as const;

const preparedHydratedListingsByIds = db.query.properties
  .findMany({
    ...getPropertyCardQueryConfig(),
    columns: {
      ...getPropertyCardQueryConfig().columns,
      id: true,
    },
    where: {
      RAW: (table) => sql`${table.id} = ANY(${sql.placeholder('uuids')})`,
    },
  })
  .prepare('get_hydrated_listings_by_ids');

const HYDRATION_PREWARM_UUID = '00000000-0000-7000-8000-000000000000';

async function prewarmHydratedListingsQuery(): Promise<void> {
  try {
    await preparedHydratedListingsByIds.execute({ uuids: [HYDRATION_PREWARM_UUID] });
  } catch {
    // Best-effort prewarm only.
  }
}

void prewarmHydratedListingsQuery();

const DEFAULT_HYDRATION_PAGE_SIZE = 48;

function decodeHydrationCursor(cursor?: string | null, total?: number): number {
  if (!cursor) {
    return 0;
  }

  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  if (typeof total === 'number' && parsed >= total) {
    return total;
  }

  return parsed;
}

async function getHydratedListingCardsByIds(uuids: string[]): Promise<TPropertyCard[]> {
  if (!uuids.length) {
    return [];
  }

  const rows = await preparedHydratedListingsByIds.execute({ uuids });
  const rowsById = new Map(rows.map((row) => [String(row.id), row as TPropertyCardRow]));

  // Preserve marker ordering for stable pagination and UI rendering.
  return uuids
    .map((id) => rowsById.get(id))
    .filter((row): row is TPropertyCardRow => Boolean(row))
    .map((row) => formatPropertyCardData(row));
}

async function prefetchHydratedListingsPage(
  sessionId: string,
  offset: number,
  pageSize: number,
): Promise<void> {
  if (offset < 0) {
    return;
  }

  const cached = await getCachedHydratedListingsPage(sessionId, offset, pageSize);
  if (cached) {
    return;
  }

  const sessionPage = await getListingsSearchSessionPage(sessionId, offset, pageSize);
  if (!sessionPage) {
    return;
  }

  const items = await getHydratedListingCardsByIds(sessionPage.ids);
  const nextOffset = offset + pageSize;
  const page: HydratedListingsCachePage = {
    items,
    nextCursor: nextOffset < sessionPage.total ? String(nextOffset) : null,
    hasMore: nextOffset < sessionPage.total,
  };

  await setCachedHydratedListingsPage(sessionId, offset, pageSize, page);
}

export async function getHydratedListingsPaginated({
  sessionId,
  limit,
  cursor,
}: {
  sessionId: string;
  limit?: number | null;
  cursor?: string | null;
}): Promise<CursorResult<TPropertyCard>> {
  const pageSize = limit ?? DEFAULT_HYDRATION_PAGE_SIZE;
  const offset = decodeHydrationCursor(cursor);
  const cachedPage = await getCachedHydratedListingsPage(sessionId, offset, pageSize);
  if (cachedPage) {
    return cachedPage;
  }

  const sessionPage = await getListingsSearchSessionPage(sessionId, offset, pageSize);

  if (!sessionPage) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  const items = await getHydratedListingCardsByIds(sessionPage.ids);
  const nextOffset = offset + pageSize;
  const result: CursorResult<TPropertyCard> = {
    items,
    nextCursor: nextOffset < sessionPage.total ? String(nextOffset) : null,
    hasMore: nextOffset < sessionPage.total,
  };

  await setCachedHydratedListingsPage(sessionId, offset, pageSize, result);

  if (result.hasMore) {
    void prefetchHydratedListingsPage(sessionId, nextOffset, pageSize).catch(() => undefined);
  }

  return result;
}

async function getListingsForSearchAndFilterMarkers(
  input?: ListingsSearchInput,
): Promise<PropertySearchMarker[]> {
  const source = input ?? {};
  const query = source.query ?? null;
  const hasDynamicFilters = hasDynamicListingsFilters(source);
  const hasExplicitSort = source.sortBy !== null && source.sortBy !== undefined;
  const hasExplicitLimit = source.limit !== null && source.limit !== undefined;
  const sortBy: ListingsSortBy = source.sortBy ?? 'newest';
  const preparedBySort = preparedListingsQueryMap[sortBy];
  const sortByForRange: Exclude<ListingsSortBy, 'proximity'> =
    sortBy === 'proximity' ? 'newest' : sortBy;
  const noFilterParams: ListingsNoFilterParams = {
    limit: source.limit ?? undefined,
  };

  const hasPriceFilter = hasValue(source.price?.min) || hasValue(source.price?.max);
  const hasSqFtFilter = hasValue(source.sqFt?.min) || hasValue(source.sqFt?.max);
  const hasBedroomsFilter = hasValue(source.bedrooms?.min) || hasValue(source.bedrooms?.max);
  const hasBathroomsFilter = hasValue(source.bathrooms?.min) || hasValue(source.bathrooms?.max);
  const hasMapBoundsFilter =
    source.useMapBounds === true &&
    source.bounds !== null &&
    source.bounds !== undefined &&
    hasValue(source.bounds.northEast?.lat) &&
    hasValue(source.bounds.northEast?.lng) &&
    hasValue(source.bounds.southWest?.lat) &&
    hasValue(source.bounds.southWest?.lng);
  const hasProximityFilter =
    hasValue(source.proximity?.lat) &&
    hasValue(source.proximity?.lng) &&
    hasValue(source.proximity?.radiusMiles);
  const activeRangeFilterCount = [
    hasPriceFilter,
    hasSqFtFilter,
    hasBedroomsFilter,
    hasBathroomsFilter,
  ].filter(Boolean).length;

  const params: ListingsPreparedParams = {
    limit: source.limit ?? undefined,
    priceMin: source.price?.min ?? null,
    priceMax: source.price?.max ?? null,
    sqFtMin: source.sqFt?.min ?? null,
    sqFtMax: source.sqFt?.max ?? null,
    bedroomsMin: source.bedrooms?.min ?? null,
    bedroomsMax: source.bedrooms?.max ?? null,
    bathroomsMin: source.bathrooms?.min ?? null,
    bathroomsMax: source.bathrooms?.max ?? null,
    useMapBounds: source.useMapBounds === true,
    boundsNorthEastLat: source.bounds?.northEast.lat ?? null,
    boundsNorthEastLng: source.bounds?.northEast.lng ?? null,
    boundsSouthWestLat: source.bounds?.southWest.lat ?? null,
    boundsSouthWestLng: source.bounds?.southWest.lng ?? null,
    proximityLat: source.proximity?.lat ?? null,
    proximityLng: source.proximity?.lng ?? null,
    proximityRadiusMiles: source.proximity?.radiusMiles ?? null,
    ...buildProximityH3Params(source.proximity),
  };

  // Preserve the original fastest marker path when the caller did not request
  // sorting, filtering, search, or pagination limit.
  if (!query && !hasDynamicFilters && !hasExplicitSort) {
    if (!hasExplicitLimit) {
      const cachedBaselineMarkers = await getCachedBaselineMarkers();
      if (cachedBaselineMarkers) {
        return cachedBaselineMarkers;
      }

      return fetchAndCacheBaselineMarkers();
    }

    return preparedListingsLegacyNoSortWithLimit.execute(noFilterParams);
  }

  if (!query && !hasMapBoundsFilter && !hasProximityFilter && activeRangeFilterCount === 1) {
    if (hasSqFtFilter) {
      const rangeParams: ListingsRangeNumericParams = {
        limit: source.limit ?? undefined,
        rangeMin: source.sqFt?.min ?? 0,
        rangeMax: source.sqFt?.max ?? 1_000_000_000,
      };
      return preparedListingsSqFtRangeQueryMap[sortByForRange].execute(rangeParams);
    }

    if (hasPriceFilter) {
      const rangeParams: ListingsRangeNumericParams = {
        limit: source.limit ?? undefined,
        rangeMin: source.price?.min ?? 0,
        rangeMax: source.price?.max ?? 1_000_000_000,
      };
      return preparedListingsPriceRangeQueryMap[sortByForRange].execute(rangeParams);
    }

    if (hasBedroomsFilter) {
      const rangeParams: ListingsRangeIntegerParams = {
        limit: source.limit ?? undefined,
        rangeMin: source.bedrooms?.min ?? 0,
        rangeMax: source.bedrooms?.max ?? 1000,
      };
      return preparedListingsBedroomsRangeQueryMap[sortByForRange].execute(rangeParams);
    }

    const rangeParams: ListingsRangeIntegerParams = {
      limit: source.limit ?? undefined,
      rangeMin: source.bathrooms?.min ?? 0,
      rangeMax: source.bathrooms?.max ?? 1000,
    };
    return preparedListingsBathroomsRangeQueryMap[sortByForRange].execute(rangeParams);
  }

  if (!query && !hasDynamicFilters && preparedBySort.withoutSearchNoFilters) {
    return preparedBySort.withoutSearchNoFilters.execute(noFilterParams);
  }

  if (query) {
    return preparedBySort.withSearch.execute({
      query,
      ...params,
    });
  }

  return preparedBySort.withoutSearch.execute(params);
}

export async function getListingsForSearchAndFilter(
  input?: ListingsSearchInput,
): Promise<ListingsSearchWithSessionResult> {
  const markers = await getListingsForSearchAndFilterMarkers(input);

  const { sessionId, total } = await createListingsSearchSession(markers);

  // Prime first hydration page without delaying the search response.
  void prefetchHydratedListingsPage(sessionId, 0, DEFAULT_HYDRATION_PAGE_SIZE).catch(
    () => undefined,
  );

  return {
    sessionId,
    total,
    markers,
  };
}


