import type {
  CursorResult,
  StandardStatus,
  TListingMarker,
  TListingsSearch,
  TListingsSortBy,
  TPropertyCard,
} from '@kws/types';

import { properties } from '@kws/schema';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';

import { db } from '@/lib/database';

import { DEFAULT_ACTIVE_STATUSES } from './constants';
import {
  formatPropertyCardData,
  getPropertyCardQueryConfig,
  type TPropertyCardRow,
} from './properties';

const DEFAULT_LIMIT = 48;
const MAX_LIMIT = 96;

type TMarkerCursorPayload = {
  sortBy: TListingsSortBy;
  listingKey: string;
  sortDate?: string | null;
  sortPrice?: string | null;
  distanceMiles?: number;
};

type TMarkerQueryInput = {
  search: Partial<TListingsSearch>;
  limit?: number | null;
  cursor?: string | null;
  statuses?: StandardStatus[];
};

type TMarkerRow = TListingMarker & {
  sortDate: string | null;
  sortPrice: string | null;
  distanceMiles: number | null;
};

type TAllMarkerRow = TListingMarker;

const normalizeLimit = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(value), MAX_LIMIT);
};

const normalizeSearch = (search: Partial<TListingsSearch>) => {
  const normalizedSortBy: TListingsSortBy =
    search.sortBy === 'priceAsc' ||
      search.sortBy === 'priceDesc' ||
      (search.sortBy === 'proximity' && search.proximity)
      ? search.sortBy
      : 'newest';

  return {
    ...search,
    limit: normalizeLimit(search.limit),
    sortBy: normalizedSortBy,
  };
};

const encodeCursor = (payload: TMarkerCursorPayload) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decodeCursor = (cursor: string | null | undefined): TMarkerCursorPayload | null => {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as TMarkerCursorPayload;

    if (!decoded || typeof decoded !== 'object' || typeof decoded.listingKey !== 'string') {
      return null;
    }

    if (!decoded.sortBy) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

const distanceMilesExpr = (lat: number, lng: number) => sql<number>`
	(
		3959 * acos(
			least(
				1,
				greatest(
					-1,
					cos(radians(${lat})) * cos(radians(${properties.latitude}))
					* cos(radians(${properties.longitude}) - radians(${lng}))
					+ sin(radians(${lat})) * sin(radians(${properties.latitude}))
				)
			)
		)
	)
`;

const sortDateExpr = sql<
  string | null
>`coalesce(${properties.onMarketDate}, ${properties.modificationTimestamp})`;
const sortPriceExpr = sql<string | null>`${properties.listPrice}`;

const buildSharedFilters = (
  input: ReturnType<typeof normalizeSearch>,
  statuses: StandardStatus[],
) => {
  const filters: SQL[] = [
    eq(properties.mlgCanView, true),
    isNull(properties.deletedAt),
    inArray(properties.standardStatus, statuses),
    isNotNull(properties.latitude),
    isNotNull(properties.longitude),
  ];

  if (input.query) {
    filters.push(
      sql`${properties.searchVector} @@ websearch_to_tsquery('english', ${input.query})`,
    );
  }

  if (input.price?.min !== null && input.price?.min !== undefined) {
    filters.push(sql`${properties.listPrice} >= ${String(input.price.min)}`);
  }

  if (input.price?.max !== null && input.price?.max !== undefined) {
    filters.push(sql`${properties.listPrice} <= ${String(input.price.max)}`);
  }

  if (input.sqFt?.min !== null && input.sqFt?.min !== undefined) {
    filters.push(sql`${properties.livingArea} >= ${String(input.sqFt.min)}`);
  }

  if (input.sqFt?.max !== null && input.sqFt?.max !== undefined) {
    filters.push(sql`${properties.livingArea} <= ${String(input.sqFt.max)}`);
  }

  if (input.bedrooms?.min !== null && input.bedrooms?.min !== undefined) {
    filters.push(gte(properties.bedroomsTotal, input.bedrooms.min));
  }

  if (input.bedrooms?.max !== null && input.bedrooms?.max !== undefined) {
    filters.push(lte(properties.bedroomsTotal, input.bedrooms.max));
  }

  if (input.bathrooms?.min !== null && input.bathrooms?.min !== undefined) {
    filters.push(gte(properties.bathroomsTotalInteger, input.bathrooms.min));
  }

  if (input.bathrooms?.max !== null && input.bathrooms?.max !== undefined) {
    filters.push(lte(properties.bathroomsTotalInteger, input.bathrooms.max));
  }

  if (input.bounds) {
    filters.push(gte(properties.latitude, input.bounds.southWest.lat));
    filters.push(lte(properties.latitude, input.bounds.northEast.lat));
    filters.push(gte(properties.longitude, input.bounds.southWest.lng));
    filters.push(lte(properties.longitude, input.bounds.northEast.lng));
  }

  if (input.proximity) {
    filters.push(isNotNull(properties.latitude));
    filters.push(isNotNull(properties.longitude));
    filters.push(
      lte(distanceMilesExpr(input.proximity.lat, input.proximity.lng), input.proximity.radiusMiles),
    );
  }

  if (input.sortBy === 'priceAsc' || input.sortBy === 'priceDesc') {
    filters.push(isNotNull(properties.listPrice));
  }

  return filters;
};

const buildCursorFilter = (
  input: ReturnType<typeof normalizeSearch>,
  cursor: TMarkerCursorPayload | null,
) => {
  if (!cursor || cursor.sortBy !== input.sortBy) {
    return null;
  }

  if (input.sortBy === 'priceAsc') {
    if (!cursor.sortPrice) {
      return null;
    }

    return sql`(
			${sortPriceExpr} > ${cursor.sortPrice}
			OR (${sortPriceExpr} = ${cursor.sortPrice} AND ${properties.listingKey} > ${cursor.listingKey})
		)`;
  }

  if (input.sortBy === 'priceDesc') {
    if (!cursor.sortPrice) {
      return null;
    }

    return sql`(
			${sortPriceExpr} < ${cursor.sortPrice}
			OR (${sortPriceExpr} = ${cursor.sortPrice} AND ${properties.listingKey} < ${cursor.listingKey})
		)`;
  }

  if (input.sortBy === 'proximity' && input.proximity) {
    if (typeof cursor.distanceMiles !== 'number') {
      return null;
    }

    const distanceExpr = distanceMilesExpr(input.proximity.lat, input.proximity.lng);
    return sql`(
			${distanceExpr} > ${cursor.distanceMiles}
			OR (${distanceExpr} = ${cursor.distanceMiles} AND ${properties.listingKey} > ${cursor.listingKey})
		)`;
  }

  if (!cursor.sortDate) {
    return null;
  }

  return sql`(
		${sortDateExpr} < ${cursor.sortDate}
		OR (${sortDateExpr} = ${cursor.sortDate} AND ${properties.listingKey} < ${cursor.listingKey})
	)`;
};

const buildOrderBy = (input: ReturnType<typeof normalizeSearch>) => {
  if (input.sortBy === 'priceAsc') {
    return [asc(properties.listPrice), asc(properties.listingKey)] as const;
  }

  if (input.sortBy === 'priceDesc') {
    return [desc(properties.listPrice), desc(properties.listingKey)] as const;
  }

  if (input.sortBy === 'proximity' && input.proximity) {
    return [
      asc(distanceMilesExpr(input.proximity.lat, input.proximity.lng)),
      asc(properties.listingKey),
    ] as const;
  }

  return [desc(sortDateExpr), desc(properties.listingKey)] as const;
};

const toMarkerCursor = (input: ReturnType<typeof normalizeSearch>, row: TMarkerRow) => {
  const payload: TMarkerCursorPayload = {
    sortBy: input.sortBy,
    listingKey: row.listingKey,
  };

  if (input.sortBy === 'priceAsc' || input.sortBy === 'priceDesc') {
    payload.sortPrice = row.sortPrice;
  } else if (input.sortBy === 'proximity') {
    payload.distanceMiles = row.distanceMiles ?? 0;
  } else {
    payload.sortDate = row.sortDate;
  }

  return encodeCursor(payload);
};

const mapMarkerItem = (row: TMarkerRow): TListingMarker => ({
  listingKey: row.listingKey,
  latitude: row.latitude,
  longitude: row.longitude,
  listPrice: row.listPrice,
  standardStatus: row.standardStatus,
});

const mapAllMarkerItem = (row: TAllMarkerRow): TListingMarker => ({
  listingKey: row.listingKey,
  latitude: row.latitude,
  longitude: row.longitude,
  listPrice: row.listPrice,
  standardStatus: row.standardStatus,
});

export async function searchListingsPageMarkers(
  input: TMarkerQueryInput,
): Promise<CursorResult<TListingMarker>> {
  const normalized = normalizeSearch(input.search);
  const statuses = input.statuses?.length ? input.statuses : DEFAULT_ACTIVE_STATUSES;
  const limit = normalizeLimit(input.limit ?? normalized.limit);
  const cursor = decodeCursor(input.cursor);

  const filters = buildSharedFilters(normalized, statuses);
  const cursorFilter = buildCursorFilter(normalized, cursor);

  if (cursorFilter) {
    filters.push(cursorFilter);
  }

  const distanceSelect = normalized.proximity
    ? distanceMilesExpr(normalized.proximity.lat, normalized.proximity.lng)
    : sql<number | null>`null`;

  const rows = await db
    .select({
      listingKey: properties.listingKey,
      latitude: properties.latitude,
      longitude: properties.longitude,
      listPrice: sql<string | null>`${properties.listPrice}`,
      standardStatus: properties.standardStatus,
      sortDate: sortDateExpr,
      sortPrice: sortPriceExpr,
      distanceMiles: distanceSelect,
    })
    .from(properties)
    .where(and(...filters))
    .orderBy(...buildOrderBy(normalized))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit) as TMarkerRow[];
  const nextCursor =
    hasMore && pageRows.length > 0
      ? toMarkerCursor(normalized, pageRows[pageRows.length - 1])
      : null;

  return {
    items: pageRows.map(mapMarkerItem),
    nextCursor,
    hasMore,
  };
}

export async function searchListingsPageCards(
  input: TMarkerQueryInput,
): Promise<CursorResult<TPropertyCard>> {
  const markerPage = await searchListingsPageMarkers(input);
  const listingKeys = markerPage.items.map((item) => item.listingKey);

  const cards = listingKeys.length
    ? await hydrateListingCardsByKeys({
      listingKeys,
      statuses: input.statuses,
      maxBatchSize: typeof input.limit === 'number' ? input.limit : undefined,
    })
    : [];

  return {
    items: cards,
    nextCursor: markerPage.nextCursor,
    hasMore: markerPage.hasMore,
  };
}

export async function searchListingsAllMarkers(
  input: Pick<TMarkerQueryInput, 'search' | 'statuses'>,
): Promise<TListingMarker[]> {
  const normalized = normalizeSearch(input.search);
  const statuses = input.statuses?.length ? input.statuses : DEFAULT_ACTIVE_STATUSES;
  const filters = buildSharedFilters(normalized, statuses);

  const rows = await db
    .select({
      listingKey: properties.listingKey,
      latitude: properties.latitude,
      longitude: properties.longitude,
      listPrice: sql<string | null>`${properties.listPrice}`,
      standardStatus: properties.standardStatus,
    })
    .from(properties)
    .where(and(...filters))
    .orderBy(asc(properties.listingKey));

  return (rows as TAllMarkerRow[]).map(mapAllMarkerItem);
}

export async function searchListingsCount(
  input: Pick<TMarkerQueryInput, 'search' | 'statuses'>,
): Promise<number> {
  const normalized = normalizeSearch(input.search);
  const statuses = input.statuses?.length ? input.statuses : DEFAULT_ACTIVE_STATUSES;

  const filters = buildSharedFilters(normalized, statuses);

  const [result] = await db
    .select({ count: sql<string>`count(*)` })
    .from(properties)
    .where(and(...filters));

  return Number(result?.count ?? 0);
}

export async function hydrateListingCardsByKeys(input: {
  listingKeys: string[];
  statuses?: StandardStatus[];
  maxBatchSize?: number;
}): Promise<TPropertyCard[]> {
  const uniqueKeys = [...new Set(input.listingKeys.filter(Boolean))];

  if (uniqueKeys.length === 0) {
    return [];
  }

  const maxBatchSize =
    typeof input.maxBatchSize === 'number' && input.maxBatchSize > 0
      ? Math.floor(input.maxBatchSize)
      : MAX_LIMIT;
  const limitedKeys = uniqueKeys.slice(0, maxBatchSize);
  const statuses = input.statuses?.length ? input.statuses : DEFAULT_ACTIVE_STATUSES;

  const rows = await db.query.properties.findMany({
    ...getPropertyCardQueryConfig(),
    where: {
      AND: [
        {
          mlgCanView: true,
          deletedAt: { isNull: true },
          standardStatus: { in: statuses },
          listingKey: { in: limitedKeys },
        },
      ],
    },
  });

  const cardsByKey = new Map(
    rows.map((row) => [row.listingKey, formatPropertyCardData(row as TPropertyCardRow)]),
  );

  return limitedKeys
    .map((listingKey) => cardsByKey.get(listingKey))
    .filter((card): card is TPropertyCard => Boolean(card));
}
