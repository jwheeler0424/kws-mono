import {
  listingsSearchShapeSchema,
  normalizeListingsSearch,
  toListingsSearchUrl,
  type TListingsSearch,
  type TMapBounds,
  type TQueryResourceLimit,
} from '@kws/types';

export type TListingsRouteSearch = ReturnType<typeof toListingsSearchUrl>;

type QueryValue = string | string[] | undefined;
type QueryInput = Record<string, QueryValue>;

export type TListingsSearchPatch = Partial<TListingsSearch>;

export const DEFAULT_LISTINGS_SEARCH: Readonly<TListingsSearch> = {
  query: null,
  limit: null,
  price: null,
  sqFt: null,
  bedrooms: null,
  bathrooms: null,
  useMapBounds: false,
  bounds: null,
  sortBy: null,
  proximity: null,
};

const pickFirst = (value: QueryValue): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const readNumber = (value: QueryValue): number | null => {
  const raw = pickFirst(value);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const readInteger = (value: QueryValue): number | null => {
  const parsed = readNumber(value);
  if (parsed === null) {
    return null;
  }

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const readBoolean = (value: QueryValue): boolean | null => {
  const raw = pickFirst(value);
  if (!raw) {
    return null;
  }

  if (raw === 'true' || raw === '1') {
    return true;
  }

  if (raw === 'false' || raw === '0') {
    return false;
  }

  return null;
};

const readRange = (prefix: string, input: QueryInput): TQueryResourceLimit | null => {
  const min = readInteger(input[`${prefix}Min`]);
  const max = readInteger(input[`${prefix}Max`]);

  if (min === null && max === null) {
    return null;
  }

  return { min, max };
};

const readBounds = (input: QueryInput): TMapBounds | null => {
  const neLat = readNumber(input.boundsNeLat);
  const neLng = readNumber(input.boundsNeLng);
  const swLat = readNumber(input.boundsSwLat);
  const swLng = readNumber(input.boundsSwLng);

  if (neLat === null || neLng === null || swLat === null || swLng === null) {
    return null;
  }

  return {
    northEast: { lat: neLat, lng: neLng },
    southWest: { lat: swLat, lng: swLng },
  };
};

const readProximity = (input: QueryInput): TListingsSearch['proximity'] => {
  const lat = readNumber(input.proximityLat);
  const lng = readNumber(input.proximityLng);
  const radiusMiles = readNumber(input.proximityRadiusMiles);

  if (lat === null || lng === null || radiusMiles === null) {
    return null;
  }

  return { lat, lng, radiusMiles };
};

const safeNormalize = (value: TListingsSearch): TListingsSearch => {
  const parsed = listingsSearchShapeSchema.safeParse(value);
  if (!parsed.success) {
    return { ...DEFAULT_LISTINGS_SEARCH };
  }

  return normalizeListingsSearch(parsed.data);
};

export const parseListingsSearch = (value: unknown): TListingsSearch => {
  const parsed = listingsSearchShapeSchema.safeParse(value);
  if (!parsed.success) {
    return { ...DEFAULT_LISTINGS_SEARCH };
  }

  return normalizeListingsSearch(parsed.data);
};

export const fromQueryString = (queryString: string): TListingsSearch => {
  const normalizedQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const params = new URLSearchParams(normalizedQuery);

  const input: QueryInput = {};
  for (const [key, val] of params.entries()) {
    input[key] = val;
  }

  return parseListingsSearch({
    query: pickFirst(input.query) ?? null,
    limit: readInteger(input.limit),
    price: readRange('price', input),
    sqFt: readRange('sqFt', input),
    bedrooms: readRange('bedrooms', input),
    bathrooms: readRange('bathrooms', input),
    useMapBounds: readBoolean(input.useMapBounds),
    bounds: readBounds(input),
    sortBy: pickFirst(input.sortBy) ?? null,
    proximity: readProximity(input),
  });
};

export const mergeListingsSearchPatch = (
  base: TListingsSearch,
  patch: TListingsSearchPatch,
): TListingsSearch => safeNormalize({ ...base, ...patch });

export const encodeListingsSearch = (
  search: TListingsSearch,
): ReturnType<typeof toListingsSearchUrl> => toListingsSearchUrl(safeNormalize(search));

export const toQueryParams = (search: TListingsSearch): URLSearchParams => {
  const encoded = encodeListingsSearch(search);
  const params = new URLSearchParams();

  if (encoded.query) {
    params.set('query', encoded.query);
  }

  if (typeof encoded.limit === 'number') {
    params.set('limit', String(encoded.limit));
  }

  if (encoded.price?.min != null) {
    params.set('priceMin', String(encoded.price.min));
  }
  if (encoded.price?.max != null) {
    params.set('priceMax', String(encoded.price.max));
  }

  if (encoded.sqFt?.min != null) {
    params.set('sqFtMin', String(encoded.sqFt.min));
  }
  if (encoded.sqFt?.max != null) {
    params.set('sqFtMax', String(encoded.sqFt.max));
  }

  if (encoded.bedrooms?.min != null) {
    params.set('bedroomsMin', String(encoded.bedrooms.min));
  }
  if (encoded.bedrooms?.max != null) {
    params.set('bedroomsMax', String(encoded.bedrooms.max));
  }

  if (encoded.bathrooms?.min != null) {
    params.set('bathroomsMin', String(encoded.bathrooms.min));
  }
  if (encoded.bathrooms?.max != null) {
    params.set('bathroomsMax', String(encoded.bathrooms.max));
  }

  if (encoded.useMapBounds) {
    params.set('useMapBounds', 'true');
  }

  if (encoded.bounds) {
    params.set('boundsNeLat', String(encoded.bounds.northEast.lat));
    params.set('boundsNeLng', String(encoded.bounds.northEast.lng));
    params.set('boundsSwLat', String(encoded.bounds.southWest.lat));
    params.set('boundsSwLng', String(encoded.bounds.southWest.lng));
  }

  if (encoded.sortBy) {
    params.set('sortBy', encoded.sortBy);
  }

  if (encoded.proximity) {
    params.set('proximityLat', String(encoded.proximity.lat));
    params.set('proximityLng', String(encoded.proximity.lng));
    params.set('proximityRadiusMiles', String(encoded.proximity.radiusMiles));
  }

  return params;
};

export const toQueryString = (search: TListingsSearch): string => toQueryParams(search).toString();

export const toRouteSearch = (search: TListingsSearch): ReturnType<typeof toListingsSearchUrl> =>
  encodeListingsSearch(search);
