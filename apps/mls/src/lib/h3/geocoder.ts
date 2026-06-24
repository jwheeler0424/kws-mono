/**
 * Geocoder — resolves city names, zip codes, and addresses to lat/lng
 *
 * Primary: Nominatim (OpenStreetMap) — free, no API key, 1 req/sec
 * Alternative: swap GEOCODER_PROVIDER=mapbox|geocodio for higher throughput
 *
 * All results are cached in the `geo_cache` DB table with a 30-day TTL
 * so each unique query only ever hits the geocoder once.
 */

import { db } from '@/lib/database';
import { createLogger } from '@kws/logger';
import { geoCache } from '@kws/schema';

import type { H3Resolution } from './index';

import { getCityCells, getZipCells, H3_RES, latLngToCell } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeoQueryType = 'city' | 'zip' | 'address' | 'area';

export interface GeoResult {
  query: string;
  type: GeoQueryType;
  lat: number;
  lng: number;
  displayName: string;
  // H3 cells at each resolution
  r6Cell: string; // single cell at district level
  r7Cell: string; // single cell at neighborhood level
  r8Cell: string; // single cell at block level
  // Expanded cell sets for DB queries
  searchCells: string[]; // cells to query at the primary resolution
  searchResolution: H3Resolution;
  // Map viewport
  bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
}

// Cache TTL: 30 days (geocoded places don't move)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Rate limiter — serialized promise chain guarantees 1 req/sec to Nominatim.
// The previous `let _lastNominatimCall` approach had a race condition where two
// concurrent callers both read the same timestamp and both proceeded immediately.
// A promise chain ensures calls are strictly queued, never concurrent.
// ---------------------------------------------------------------------------

let _nominatimQueue: Promise<void> = Promise.resolve();

async function nominatimThrottle() {
  // Append a 1100ms wait onto the existing queue, then await our slot.
  // Each call waits for all preceding calls to finish before proceeding.
  const mySlot = (_nominatimQueue = _nominatimQueue.then(
    () => new Promise<void>((r) => setTimeout(r, 1100)),
  ));
  await mySlot;
}

const geocoderLogger = createLogger('h3').child('geocoder');

// ---------------------------------------------------------------------------
// L1 in-memory cache (process-scoped, sub-ms lookup for hot queries).
// Bounded by the finite number of unique location queries — typically < 500
// entries in a real workload. No TTL needed here since entries also live in
// the DB cache; stale in-memory entries are harmless (30-day TTL in DB).
// ---------------------------------------------------------------------------

const DEFAULT_MEM_CACHE_MAX_ENTRIES = 2_000;
const MEM_CACHE_MAX_ENTRIES = DEFAULT_MEM_CACHE_MAX_ENTRIES;
const _memCache = new Map<string, GeoResult>();

function getMemCache(cacheKey: string) {
  const cached = _memCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  // LRU refresh: move hot key to the back.
  _memCache.delete(cacheKey);
  _memCache.set(cacheKey, cached);
  return cached;
}

function setMemCache(cacheKey: string, result: GeoResult) {
  if (_memCache.has(cacheKey)) {
    _memCache.delete(cacheKey);
  }
  _memCache.set(cacheKey, result);

  while (_memCache.size > MEM_CACHE_MAX_ENTRIES) {
    const firstKey = _memCache.keys().next().value;
    if (!firstKey) {
      break;
    }
    _memCache.delete(firstKey);
  }
}

// ---------------------------------------------------------------------------
// Main geocode function
// ---------------------------------------------------------------------------

/**
 * Resolve a query string to a GeoResult.
 *
 * Cache hierarchy:
 *   L1 — in-memory Map (< 1ms, process-scoped)
 *   L2 — geo_cache DB table (< 5ms, survives restarts, 30-day TTL)
 *   L3 — Nominatim HTTP (1100ms minimum due to rate limit)
 */
export async function geocode(
  query: string,
  type: GeoQueryType = 'city',
): Promise<GeoResult | null> {
  const cacheKey = `${type}:${query.toLowerCase().trim()}`;

  // L1: memory cache
  const mem = getMemCache(cacheKey);
  if (mem) return mem;

  // L2: DB cache
  const cached = await db.query.geoCache?.findFirst({
    where: {
      cacheKey,
      expiresAt: { gt: new Date() },
    },
  });

  if (cached) {
    const result = deserializeCacheRow(cached);
    setMemCache(cacheKey, result);
    return result;
  }

  // L3: Nominatim (rate-limited)
  const result = await fetchNominatim(query, type);
  if (!result) return null;

  // Compute H3 cells
  const r6Cell = latLngToCell(result.lat, result.lng, H3_RES.DISTRICT);
  const r7Cell = latLngToCell(result.lat, result.lng, H3_RES.NEIGHBORHOOD);
  const r8Cell = latLngToCell(result.lat, result.lng, H3_RES.BLOCK);

  const { cells: searchCells, resolution: searchResolution } =
    type === 'zip' ? getZipCells(result.lat, result.lng) : getCityCells(result.lat, result.lng);

  const bbox = {
    minLng: result.bboxMinLng,
    minLat: result.bboxMinLat,
    maxLng: result.bboxMaxLng,
    maxLat: result.bboxMaxLat,
  };

  const geoResult: GeoResult = {
    query,
    type,
    lat: result.lat,
    lng: result.lng,
    displayName: result.displayName,
    r6Cell,
    r7Cell,
    r8Cell,
    searchCells,
    searchResolution,
    bbox,
  };

  // Persist to cache
  await db
    .insert(geoCache)
    .values({
      cacheKey,
      query,
      type,
      lat: String(result.lat),
      lng: String(result.lng),
      displayName: result.displayName,
      r6Cell,
      r7Cell,
      r8Cell,
      searchCells,
      searchResolution,
      bboxMinLng: String(bbox.minLng),
      bboxMinLat: String(bbox.minLat),
      bboxMaxLng: String(bbox.maxLng),
      bboxMaxLat: String(bbox.maxLat),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    })
    .onConflictDoUpdate({
      target: geoCache.cacheKey,
      set: {
        lat: String(result.lat),
        lng: String(result.lng),
        displayName: result.displayName,
        r6Cell,
        r7Cell,
        r8Cell,
        searchCells,
        searchResolution,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        updatedAt: new Date(),
      },
    });

  setMemCache(cacheKey, geoResult);

  return geoResult;
}

// ---------------------------------------------------------------------------
// Nominatim fetch
// ---------------------------------------------------------------------------

interface NominatimResult {
  lat: number;
  lng: number;
  displayName: string;
  bboxMinLng: number;
  bboxMinLat: number;
  bboxMaxLng: number;
  bboxMaxLat: number;
}

async function fetchNominatim(query: string, type: GeoQueryType): Promise<NominatimResult | null> {
  await nominatimThrottle();

  const params = new URLSearchParams({
    q: type === 'zip' ? `${query}, Washington, USA` : `${query}, Washington, USA`,
    format: 'json',
    limit: '1',
    addressdetails: '0',
    countrycodes: 'us', // restrict to USA — avoids foreign results
    viewbox: '-124.9,45.5,-116.9,49.1', // soft bias to PNW
    bounded: '0',
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'NWMLSPlatform/1.0 (property search application)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(8_000), // 8s hard timeout per request
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (!Array.isArray(json) || !json[0] || typeof json[0] !== 'object') {
      return null;
    }

    const data = json as Array<{
      lat: string;
      lon: string;
      display_name: string;
      boundingbox: [string, string, string, string]; // [minLat, maxLat, minLng, maxLng]
    }>;

    if (!data[0]) return null;

    const item = data[0];
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const [bbMinLat, bbMaxLat, bbMinLng, bbMaxLng] = item.boundingbox.map(parseFloat) as [
      number,
      number,
      number,
      number,
    ];

    // Guard: Nominatim sometimes returns a degenerate point bbox for ZIP codes
    // (both min/max nearly equal). In that case synthesize a reasonable viewport.
    const latSpan = bbMaxLat - bbMinLat;
    const lngSpan = bbMaxLng - bbMinLng;
    const MIN_SPAN = 0.02; // ~2km — smaller than any real city or zip boundary

    const safeBboxMinLat = latSpan < MIN_SPAN ? lat - 0.04 : bbMinLat;
    const safeBboxMaxLat = latSpan < MIN_SPAN ? lat + 0.04 : bbMaxLat;
    const safeBboxMinLng = lngSpan < MIN_SPAN ? lng - 0.06 : bbMinLng;
    const safeBboxMaxLng = lngSpan < MIN_SPAN ? lng + 0.06 : bbMaxLng;

    return {
      lat,
      lng,
      displayName: item.display_name,
      bboxMinLng: safeBboxMinLng,
      bboxMinLat: safeBboxMinLat,
      bboxMaxLng: safeBboxMaxLng,
      bboxMaxLat: safeBboxMaxLat,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache row deserialization
// ---------------------------------------------------------------------------

function deserializeCacheRow(row: typeof geoCache.$inferSelect): GeoResult {
  return {
    query: row.query,
    type: row.type as GeoQueryType,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    displayName: row.displayName,
    r6Cell: row.r6Cell,
    r7Cell: row.r7Cell,
    r8Cell: row.r8Cell,
    searchCells: row.searchCells,
    searchResolution: row.searchResolution as H3Resolution,
    bbox: {
      minLng: parseFloat(row.bboxMinLng),
      minLat: parseFloat(row.bboxMinLat),
      maxLng: parseFloat(row.bboxMaxLng),
      maxLat: parseFloat(row.bboxMaxLat),
    },
  };
}

// ---------------------------------------------------------------------------
// Batch geocode for multiple queries (e.g. seeding zip code index)
// ---------------------------------------------------------------------------

export async function batchGeocode(
  queries: Array<{ query: string; type: GeoQueryType }>,
): Promise<Map<string, GeoResult>> {
  const entries = await Promise.all(
    queries.map(async ({ query, type }) => {
      const result = await geocode(query, type);
      return result ? ([`${type}:${query}`, result] as const) : null;
    }),
  );

  const resultMap = new Map<string, GeoResult>();

  for (const entry of entries) {
    if (entry) {
      resultMap.set(entry[0], entry[1]);
    }
  }

  return resultMap;
}

// ---------------------------------------------------------------------------
// Known Washington State cities — pre-warm cache on first deploy
// ---------------------------------------------------------------------------

export const NWMLS_MAJOR_CITIES = [
  ...new Set([
    'Seattle',
    'Bellevue',
    'Redmond',
    'Kirkland',
    'Bothell',
    'Sammamish',
    'Issaquah',
    'Renton',
    'Auburn',
    'Kent',
    'Federal Way',
    'Tacoma',
    'Olympia',
    'Everett',
    'Marysville',
    'Edmonds',
    'Shoreline',
    'Kenmore',
    'Lynnwood',
    'Mountlake Terrace',
    'Burien',
    'Des Moines',
    'Tukwila',
    'Newcastle',
    'Mercer Island',
    'Medina',
    'Clyde Hill',
    'Yarrow Point',
    'Woodinville',
    'Duvall',
    'Monroe',
    'Snohomish',
    'Mukilteo',
    'Brier',
    'Mill Creek',
    'Maple Valley',
    'Covington',
    'Black Diamond',
    'Enumclaw',
    'North Bend',
    'Snoqualmie',
    'Carnation',
    'Fall City',
    'Preston',
    'Ravensdale',
    'Buckley',
    'Puyallup',
    'Gig Harbor',
    'Bremerton',
    'Poulsbo',
    'Kingston',
  ]),
] as const;

/**
 * Pre-warm the geocoder cache for all major NWMLS cities.
 * Run once on deploy or as a maintenance script.
 */
export async function warmGeocoderCache() {
  geocoderLogger.info('warming geocoder cache for NWMLS cities');
  await NWMLS_MAJOR_CITIES.reduce<Promise<void>>(async (previous, city) => {
    await previous;
    await geocode(city, 'city');
    geocoderLogger.debug('geocoder cache warmed for city', { city });
  }, Promise.resolve());
  geocoderLogger.info('geocoder cache warmed');
}
