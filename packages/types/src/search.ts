import { z } from 'zod';

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

export const sortBySchema = z.enum(['newest', 'priceAsc', 'priceDesc', 'proximity']);

export const proximitySchema = z.object({
  lat: z.number().refine((val) => val >= -90 && val <= 90, {
    message: 'Latitude must be between -90 and 90',
  }),
  lng: z.number().refine((val) => val >= -180 && val <= 180, {
    message: 'Longitude must be between -180 and 180',
  }),
  radiusMiles: z.number().positive(),
});

export const listingsSearchShapeSchema = z.object({
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

export const isValidMapBounds = (
  bounds: z.infer<typeof mapBoundsSchema> | null | undefined,
): bounds is z.infer<typeof mapBoundsSchema> => {
  if (!bounds) {
    return false;
  }

  return bounds.southWest.lat < bounds.northEast.lat && bounds.southWest.lng < bounds.northEast.lng;
};

export const normalizeRange = (
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

export const normalizeListingsSearch = (
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
export type TListingsSearch = z.infer<typeof listingsSearchShapeSchema>;
export type TListingsSortBy = z.infer<typeof sortBySchema>;
export type TListingsProximity = z.infer<typeof proximitySchema>;
export type TMapQuery = z.infer<typeof mapQuerySchema>;
export type TUserPosition = z.infer<typeof userPositionSchema>;
