import { z } from 'zod';
// export type QueryLimit = {
//   min: number | null;
//   max: number | null;
// };

// export type MapPosition = {
//   lat: number;
//   lng: number;
// };

// export type MapBounds = {
//   northEast: MapPosition;
//   southWest: MapPosition;
// };

// export type PropertyQueryParams = {
//   query?: string | null;
//   priceMin?: number | null;
//   priceMax?: number | null;
//   sqFtMin?: number | null;
//   sqFtMax?: number | null;
//   bedroomsMin?: number | null;
//   bedroomsMax?: number | null;
//   bathroomsMin?: number | null;
//   bathroomsMax?: number | null;
//   [key: string]: unknown;
// };

// export type MapQueryParams = {
//   bounds?: MapBounds | null;
//   mapPosition?: MapPosition | null;
// };

export const querySchema = z.string().trim();
export const queryLimitSchema = z.number().int().nonnegative();
export const queryResourceLimitSchema = z.object({
  min: queryLimitSchema.nullable(),
  max: queryLimitSchema.nullable(),
});
export const mapPositionSchema = z.object({
  lat: z.number().refine((val) => val >= -90 && val <= 90, {
    message: 'Latitude must be between -90 and 90',
  }),
  lng: z.number().refine((val) => val >= -180 && val <= 180, {
    message: 'Longitude must be between -180 and 180',
  }),
});
export const mapBoundsSchema = z.object({
  northEast: mapPositionSchema,
  southWest: mapPositionSchema,
});

export const isValidMapBounds = (
  bounds: z.infer<typeof mapBoundsSchema> | null | undefined,
): bounds is z.infer<typeof mapBoundsSchema> => {
  if (!bounds) {
    return false;
  }

  return bounds.southWest.lat < bounds.northEast.lat && bounds.southWest.lng < bounds.northEast.lng;
};

const sortBySchema = z.enum(['newest', 'priceAsc', 'priceDesc', 'proximity']);

const proximitySchema = z.object({
  lat: z.number().refine((val) => val >= -90 && val <= 90, {
    message: 'Latitude must be between -90 and 90',
  }),
  lng: z.number().refine((val) => val >= -180 && val <= 180, {
    message: 'Longitude must be between -180 and 180',
  }),
  radiusMiles: z.number().positive(),
});

const parseLegacyBounds = (value: unknown): z.infer<typeof mapBoundsSchema> | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parts = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((num) => Number.isFinite(num));

  if (parts.length !== 4) {
    return undefined;
  }

  const [northEastLat, northEastLng, southWestLat, southWestLng] = parts;

  return {
    northEast: { lat: northEastLat, lng: northEastLng },
    southWest: { lat: southWestLat, lng: southWestLng },
  };
};

const parseLegacyNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.floor(numeric);
};

const parseLegacyLimit = (
  min: unknown,
  max: unknown,
): z.infer<typeof queryResourceLimitSchema> | null => {
  const parsedMin = parseLegacyNumber(min);
  const parsedMax = parseLegacyNumber(max);

  if (parsedMin === null && parsedMax === null) {
    return null;
  }

  return {
    min: parsedMin,
    max: parsedMax,
  };
};

const listingsSearchShapeSchema = z.object({
  query: querySchema.nullable(),
  limit: queryLimitSchema.nullable(),
  price: queryResourceLimitSchema.nullable(),
  sqFt: queryResourceLimitSchema.nullable(),
  bedrooms: queryResourceLimitSchema.nullable(),
  bathrooms: queryResourceLimitSchema.nullable(),
  useMapBounds: z.boolean().nullable(),
  bounds: mapBoundsSchema.nullable(),
  sortBy: sortBySchema.nullable(),
  proximity: proximitySchema.nullable(),
});

const normalizeRange = (
  value: z.infer<typeof queryResourceLimitSchema> | null | undefined,
): z.infer<typeof queryResourceLimitSchema> | null => {
  if (!value) {
    return null;
  }

  const min = value.min ?? null;
  const max = value.max ?? null;

  if (min === null && max === null) {
    return null;
  }

  return { min, max };
};

const normalizeListingsSearch = (
  value: z.infer<typeof listingsSearchShapeSchema>,
): z.infer<typeof listingsSearchShapeSchema> => {
  const useMapBounds = Boolean(value.useMapBounds);
  const bounds = useMapBounds && isValidMapBounds(value.bounds) ? value.bounds : null;

  return {
    query: value.query ?? null,
    limit: value.limit ?? null,
    price: normalizeRange(value.price),
    sqFt: normalizeRange(value.sqFt),
    bedrooms: normalizeRange(value.bedrooms),
    bathrooms: normalizeRange(value.bathrooms),
    useMapBounds,
    bounds,
    sortBy: value.sortBy ?? null,
    proximity: value.proximity ?? null,
  };
};

export const toCanonicalListingsSearch = (
  search: Partial<z.infer<typeof listingsSearchShapeSchema>>,
) =>
  normalizeListingsSearch({
    query: search.query ?? null,
    limit: search.limit ?? null,
    price: search.price ?? null,
    sqFt: search.sqFt ?? null,
    bedrooms: search.bedrooms ?? null,
    bathrooms: search.bathrooms ?? null,
    useMapBounds: search.useMapBounds ?? null,
    bounds: search.bounds ?? null,
    sortBy: search.sortBy ?? null,
    proximity: search.proximity ?? null,
  });

export const listingsSearchSchema = z
  .object({
    query: querySchema.nullable().optional(),
    q: z.string().trim().optional(),
    limit: queryLimitSchema.nullable().optional(),
    price: queryResourceLimitSchema.nullable().optional(),
    sqFt: queryResourceLimitSchema.nullable().optional(),
    bedrooms: queryResourceLimitSchema.nullable().optional(),
    bathrooms: queryResourceLimitSchema.nullable().optional(),
    useMapBounds: z.boolean().nullable().optional(),
    mapBounds: z.string().optional(),
    bounds: mapBoundsSchema.nullable().optional(),
    sortBy: sortBySchema.nullable().optional(),
    proximity: proximitySchema.nullable().optional(),
    priceMin: z.union([z.string(), z.number()]).optional(),
    priceMax: z.union([z.string(), z.number()]).optional(),
    sqFtMin: z.union([z.string(), z.number()]).optional(),
    sqFtMax: z.union([z.string(), z.number()]).optional(),
    bedroomsMin: z.union([z.string(), z.number()]).optional(),
    bedroomsMax: z.union([z.string(), z.number()]).optional(),
    bathroomsMin: z.union([z.string(), z.number()]).optional(),
    bathroomsMax: z.union([z.string(), z.number()]).optional(),
  })
  .transform((value) => {
    const price = value.price ?? parseLegacyLimit(value.priceMin, value.priceMax) ?? null;
    const sqFt = value.sqFt ?? parseLegacyLimit(value.sqFtMin, value.sqFtMax) ?? null;
    const bedrooms =
      value.bedrooms ?? parseLegacyLimit(value.bedroomsMin, value.bedroomsMax) ?? null;
    const bathrooms =
      value.bathrooms ?? parseLegacyLimit(value.bathroomsMin, value.bathroomsMax) ?? null;

    return normalizeListingsSearch({
      query: value.query ?? value.q ?? null,
      limit: value.limit ?? null,
      price,
      sqFt,
      bedrooms,
      bathrooms,
      useMapBounds:
        value.useMapBounds ?? Boolean(value.bounds ?? parseLegacyBounds(value.mapBounds)),
      bounds: value.bounds ?? parseLegacyBounds(value.mapBounds) ?? null,
      sortBy: value.sortBy ?? null,
      proximity: value.proximity ?? null,
    });
  })
  .pipe(listingsSearchShapeSchema);

export const toListingsSearchUrl = (search: z.infer<typeof listingsSearchShapeSchema>) => {
  const normalized = normalizeListingsSearch(search);

  return {
    query: normalized.query?.trim() ? normalized.query.trim() : undefined,
    limit: normalized.limit ?? undefined,
    price: normalized.price ?? undefined,
    sqFt: normalized.sqFt ?? undefined,
    bedrooms: normalized.bedrooms ?? undefined,
    bathrooms: normalized.bathrooms ?? undefined,
    useMapBounds: normalized.useMapBounds ? true : undefined,
    bounds: normalized.useMapBounds ? (normalized.bounds ?? undefined) : undefined,
    sortBy: normalized.sortBy && normalized.sortBy !== 'newest' ? normalized.sortBy : undefined,
    proximity: normalized.proximity ?? undefined,
  };
};
export const mapQuerySchema = z.object({
  bounds: mapBoundsSchema.optional(),
  mapPosition: mapPositionSchema.optional(),
});
export const userPositionSchema = z.object({
  lat: z.number().refine((val) => val >= -90 && val <= 90, {
    message: 'Latitude must be between -90 and 90',
  }),
  lng: z.number().refine((val) => val >= -180 && val <= 180, {
    message: 'Longitude must be between -180 and 180',
  }),
  accuracy: z.number(),
  altitude: z.number(),
  altitudeAccuracy: z.number(),
  heading: z.number(),
  speed: z.number(),
  timestamp: z.number(),
});

export type TQuery = z.infer<typeof querySchema>;
export type TQueryLimit = z.infer<typeof queryLimitSchema>;
export type TQueryResourceLimit = z.infer<typeof queryResourceLimitSchema>;
export type TMapPosition = z.infer<typeof mapPositionSchema>;
export type TMapBounds = z.infer<typeof mapBoundsSchema>;
export type TListingsSearch = z.infer<typeof listingsSearchSchema>;
export type TListingsSortBy = z.infer<typeof sortBySchema>;
export type TListingsProximity = z.infer<typeof proximitySchema>;
export type TMapQuery = z.infer<typeof mapQuerySchema>;
export type TUserPosition = z.infer<typeof userPositionSchema>;
