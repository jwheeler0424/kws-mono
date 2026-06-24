/**
 * Geo cache schema — stores geocoded results to avoid re-fetching Nominatim
 */

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { idPrimaryKey } from './common.schema';

export const geoCache = pgTable(
  'geo_cache',
  {
    id: idPrimaryKey,
    cacheKey: varchar('cache_key', { length: 256 }).notNull(), // "city:seattle" | "zip:98101"
    query: text('query').notNull(),
    type: varchar('type', { length: 32 }).notNull(), // 'city' | 'zip' | 'address' | 'area'

    // Geocoded coordinates
    lat: varchar('lat', { length: 32 }).notNull(),
    lng: varchar('lng', { length: 32 }).notNull(),
    displayName: text('display_name').notNull(),

    // H3 single cells at each resolution
    r6Cell: varchar('r6_cell', { length: 20 }).notNull(),
    r7Cell: varchar('r7_cell', { length: 20 }).notNull(),
    r8Cell: varchar('r8_cell', { length: 20 }).notNull(),

    // Expanded search cells (for DB queries)
    searchCells: text('search_cells').array().notNull(),
    searchResolution: integer('search_resolution').notNull(),

    // Bounding box (for map viewport)
    bboxMinLng: varchar('bbox_min_lng', { length: 32 }).notNull(),
    bboxMinLat: varchar('bbox_min_lat', { length: 32 }).notNull(),
    bboxMaxLng: varchar('bbox_max_lng', { length: 32 }).notNull(),
    bboxMaxLat: varchar('bbox_max_lat', { length: 32 }).notNull(),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_geo_cache_key').on(t.cacheKey),
    index('idx_geo_cache_type').on(t.type),
    index('idx_geo_cache_expires').on(t.expiresAt),
  ],
);
