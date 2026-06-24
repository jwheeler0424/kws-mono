/**
 * H3 spatial utilities for NWMLS property search
 *
 * Resolution guide (for Pacific Northwest context):
 *   res 5  ~252 km²  — county / large metro (~9 mi radius)
 *   res 6  ~ 36 km²  — city / district     (~3.4 mi radius)
 *   res 7  ~  5 km²  — neighborhood        (~1.3 mi radius)
 *   res 8  ~  0.7 km² — micro-neighborhood (~0.5 mi radius)
 *   res 9  ~  0.1 km² — block level        (~0.2 mi radius)
 *
 * Search strategy per intent:
 *   "Near me" tight  (0.5 mi) → res 9, k=1  (7 cells  ≈ 0.7 km²  each)
 *   "Near me" medium (1.5 mi) → res 8, k=2  (19 cells ≈ 0.7 km²  each)
 *   "Near me" wide   (5 mi)   → res 7, k=3  (37 cells ≈ 5.2 km²  each)
 *   Zip code search            → res 7, disk around centroid
 *   City / district search     → res 6, disk around centroid
 *   NWMLS area search          → pre-computed compact cell set at r6/r7
 *   Polygon / drawn area       → polyfill at res 8, compact to r7
 */

import {
  cellToBoundary,
  cellToChildren,
  cellToLatLng,
  cellToParent,
  compactCells,
  getResolution,
  gridDisk,
  isPentagon,
  isValidCell,
  latLngToCell,
  polygonToCells,
} from 'h3-js';

export {
  cellToBoundary,
  cellToChildren,
  cellToLatLng,
  cellToParent,
  compactCells,
  getResolution,
  gridDisk,
  gridDistance,
  gridRing,
  isValidCell,
  latLngToCell,
  polygonToCells,
  uncompactCells,
} from 'h3-js';

// ---------------------------------------------------------------------------
// Resolution constants
// ---------------------------------------------------------------------------

export const H3_RES = {
  DISTRICT: 6, // ~36 km² — city/district level
  NEIGHBORHOOD: 7, // ~5.2 km² — neighborhood level
  BLOCK: 8, // ~0.74 km² — block/micro-neighborhood level
} as const;

export type H3Resolution = (typeof H3_RES)[keyof typeof H3_RES];

// ---------------------------------------------------------------------------
// Cell computation for a property
// ---------------------------------------------------------------------------

export interface H3PropertyCells {
  r6: string; // district
  r7: string; // neighborhood
  r8: string; // block
}

/**
 * Compute all three H3 cells for a property given its coordinates.
 * Returns null if coordinates are missing or invalid.
 */
export function computePropertyCells(
  lat: number | null | undefined,
  lng: number | null | undefined,
): H3PropertyCells | null {
  if (lat == null || lng == null) return null;
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return {
    r6: latLngToCell(lat, lng, H3_RES.DISTRICT),
    r7: latLngToCell(lat, lng, H3_RES.NEIGHBORHOOD),
    r8: latLngToCell(lat, lng, H3_RES.BLOCK),
  };
}

// ---------------------------------------------------------------------------
// "Near me" — expand from a point at a given resolution + ring count
// ---------------------------------------------------------------------------

export interface NearMeOptions {
  radiusMiles: number;
}

/**
 * Given a lat/lng and a radius in miles, returns the optimal H3 resolution
 * and the set of cells covering that radius.
 *
 * Uses k-ring (filled disk of radius k) at the appropriate resolution so that
 * the cell set tightly covers the requested distance without excessive cells.
 */
export function getNearMeCells(
  lat: number,
  lng: number,
  radiusMiles: number,
): { resolution: H3Resolution; cells: string[] } {
  if (!isFinite(radiusMiles) || radiusMiles < 0) {
    throw new RangeError(`getNearMeCells: invalid radiusMiles (${radiusMiles})`);
  }

  // Single-point request: return just the center cell
  if (radiusMiles === 0) {
    const cell = latLngToCell(lat, lng, H3_RES.BLOCK);
    return { resolution: H3_RES.BLOCK, cells: [cell] };
  }

  // Pick resolution and k based on desired radius.
  // Cell edge lengths: r6≈3.2km, r7≈1.2km, r8≈0.46km
  let resolution: H3Resolution;
  let k: number;

  if (radiusMiles <= 0.75) {
    resolution = H3_RES.BLOCK; // r8, ~0.46km cells
    k = 1; // 7 cells ≈ 1 mile diameter
  } else if (radiusMiles <= 2) {
    resolution = H3_RES.BLOCK; // r8
    k = 2; // 19 cells ≈ 2 mile diameter
  } else if (radiusMiles <= 5) {
    resolution = H3_RES.NEIGHBORHOOD; // r7, ~1.2km cells
    k = 2; // 19 cells ≈ 5 mile diameter
  } else if (radiusMiles <= 10) {
    resolution = H3_RES.NEIGHBORHOOD; // r7
    k = 4; // 61 cells ≈ 10 mile diameter
  } else {
    resolution = H3_RES.DISTRICT; // r6, ~3.2km cells
    k = Math.ceil(radiusMiles / 3); // rough miles-to-k conversion
  }

  const center = latLngToCell(lat, lng, resolution);
  const cells = gridDisk(center, k);

  return { resolution, cells };
}

// ---------------------------------------------------------------------------
// City / zip search — disk around a geocoded centroid
// ---------------------------------------------------------------------------

/**
 * Cells covering a city given its centroid.
 * Uses resolution 6 (district) with a generous disk to capture the whole city.
 */
export function getCityCells(
  lat: number,
  lng: number,
  diskRadius = 2, // k=2 at r6 ≈ 19 cells covering ~30 km diameter
): { resolution: typeof H3_RES.DISTRICT; cells: string[] } {
  const center = latLngToCell(lat, lng, H3_RES.DISTRICT);
  return {
    resolution: H3_RES.DISTRICT,
    cells: gridDisk(center, diskRadius),
  };
}

/**
 * Cells covering a zip code given its centroid.
 * Uses resolution 7 (neighborhood) — zip codes in WA are ~5–20 km² typically.
 */
export function getZipCells(
  lat: number,
  lng: number,
  diskRadius = 2, // k=2 at r7 ≈ 19 cells covering ~12 km diameter
): { resolution: typeof H3_RES.NEIGHBORHOOD; cells: string[] } {
  const center = latLngToCell(lat, lng, H3_RES.NEIGHBORHOOD);
  return {
    resolution: H3_RES.NEIGHBORHOOD,
    cells: gridDisk(center, diskRadius),
  };
}

// ---------------------------------------------------------------------------
// Polygon / drawn area search
// ---------------------------------------------------------------------------

/**
 * Fill a polygon with H3 cells.
 * coordinates: array of [lng, lat] pairs (GeoJSON order) forming a closed ring.
 *
 * Returns compact cells (mixed resolutions) and a flat list at the requested
 * resolution for DB querying.
 *
 * Safety valve: if polyfill at the requested resolution produces > 2000 cells
 * (e.g. a large drawn area), automatically coarsens to the next resolution up
 * to keep the SQL array to a manageable size. The DB filter already caps at
 * 2000 cells in buildFilters(), but coarsening here reduces URL length too.
 */
export function getPolygonCells(
  coordinates: [number, number][], // [lng, lat]
  resolution: H3Resolution = H3_RES.BLOCK,
): { cells: string[]; compactCells: string[]; resolution: H3Resolution } {
  if (coordinates.length < 3) {
    return { cells: [], compactCells: [], resolution };
  }

  // h3-js polygonToCells expects [lat, lng] pairs
  const latLngCoords = coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);

  const MAX_CELLS = 2000;
  let currentRes = resolution as number;
  let cells: string[] = [];

  // Try at the requested resolution; if too many cells, step up (coarser) until
  // we're under the limit or we've reached district level (r6).
  while (currentRes >= H3_RES.DISTRICT) {
    cells = polygonToCells(latLngCoords, currentRes);
    if (cells.length <= MAX_CELLS) break;
    currentRes -= 1; // step to coarser resolution
  }

  // If even r6 is too many, take the first 2000 cells (edge case: huge polygon)
  if (cells.length > MAX_CELLS) {
    cells = cells.slice(0, MAX_CELLS);
  }

  return {
    cells,
    compactCells: compactCells(cells),
    resolution: currentRes as H3Resolution,
  };
}

// ---------------------------------------------------------------------------
// Upgrade / downgrade resolution
// ---------------------------------------------------------------------------

/**
 * Given a set of cells at any resolution, return their parents at a coarser
 * resolution (dedup'd). Useful for UI heatmaps at zoom-out.
 */
export function toParentResolution(cells: string[], targetRes: H3Resolution): string[] {
  return [...new Set(cells.map((c) => cellToParent(c, targetRes)))];
}

/**
 * Given cells at a coarse resolution, expand to fine-grained cells.
 * Useful for converting a city-level cell set to block-level for precise queries.
 */
export function toChildResolution(cells: string[], targetRes: H3Resolution): string[] {
  return cells.flatMap((c) => {
    const curRes = getResolution(c);
    if (curRes >= targetRes) return [c];
    return cellToChildren(c, targetRes);
  });
}

// ---------------------------------------------------------------------------
// Bounding box from cell set (for map viewport)
// ---------------------------------------------------------------------------

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Compute the bounding box covering all the given H3 cells.
 * Useful for setting the map viewport after a spatial search.
 */
export function cellsToBBox(cells: string[]): BBox | null {
  if (cells.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const cell of cells) {
    const boundary = cellToBoundary(cell);
    for (const [lat, lng] of boundary) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Compute the centroid of a cell set (average of all cell centers).
 */
export function cellsToCenter(cells: string[]): { lat: number; lng: number } | null {
  if (cells.length === 0) return null;
  let latSum = 0;
  let lngSum = 0;
  for (const cell of cells) {
    const [lat, lng] = cellToLatLng(cell);
    latSum += lat;
    lngSum += lng;
  }
  return { lat: latSum / cells.length, lng: lngSum / cells.length };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isValidH3Cell(cell: string): boolean {
  try {
    return isValidCell(cell) && !isPentagon(cell);
  } catch {
    return false;
  }
}

export function assertH3Cells(cells: unknown[]): cells is string[] {
  return cells.every((c) => typeof c === 'string' && isValidH3Cell(c));
}
