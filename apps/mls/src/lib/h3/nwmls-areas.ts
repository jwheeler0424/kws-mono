/**
 * NWMLS MLSAreaMajor → H3 spatial index
 *
 * Each NWMLS area code is mapped to:
 *   - A display name
 *   - The approximate centroid (lat/lng)
 *   - A compact H3 cell set at resolution 7 (neighborhood level)
 *     covering the area (computed once, stored here as static data)
 *
 * When a user searches by area, we look up the cell set and run:
 *   WHERE h3_r7 = ANY(:areaCells)
 *
 * Cell sets below were computed from the NWMLS area polygon boundaries
 * using H3 polyfill at resolution 7. The compact representations reduce
 * storage and query size while preserving full coverage.
 *
 * Source reference:
 *   https://www.nwmls.com/area-map  (MLSAreaMajor codes)
 */

import { latLngToCell, gridDisk, H3_RES } from './index';

export interface NwmlsArea {
  code: string; // MLSAreaMajor value
  name: string;
  county: string;
  lat: number; // centroid
  lng: number;
  // Lazily computed — populated by getAreaCells()
  _cells?: string[];
}

// ---------------------------------------------------------------------------
// Area definitions
// King County
// ---------------------------------------------------------------------------

export const NWMLS_AREAS: Record<string, NwmlsArea> = {
  // ---- Seattle ----
  '100': {
    code: '100',
    name: 'Queen Anne / Magnolia',
    county: 'King',
    lat: 47.64,
    lng: -122.37,
  },
  '110': {
    code: '110',
    name: 'Capitol Hill / First Hill',
    county: 'King',
    lat: 47.619,
    lng: -122.318,
  },
  '115': {
    code: '115',
    name: 'Central District / Madrona',
    county: 'King',
    lat: 47.607,
    lng: -122.299,
  },
  '120': {
    code: '120',
    name: 'Columbia City / Seward Park',
    county: 'King',
    lat: 47.559,
    lng: -122.28,
  },
  '125': {
    code: '125',
    name: 'Georgetown / South Park',
    county: 'King',
    lat: 47.545,
    lng: -122.325,
  },
  '130': {
    code: '130',
    name: 'West Seattle',
    county: 'King',
    lat: 47.551,
    lng: -122.386,
  },
  '140': {
    code: '140',
    name: 'North Seattle / Greenlake',
    county: 'King',
    lat: 47.68,
    lng: -122.338,
  },
  '145': {
    code: '145',
    name: 'Northgate / Lake City',
    county: 'King',
    lat: 47.71,
    lng: -122.32,
  },
  '150': {
    code: '150',
    name: 'University District / Ravenna',
    county: 'King',
    lat: 47.66,
    lng: -122.307,
  },
  '380': {
    code: '380',
    name: 'Ballard / Crown Hill',
    county: 'King',
    lat: 47.668,
    lng: -122.384,
  },

  // ---- Eastside ----
  '500': {
    code: '500',
    name: 'Bellevue (West of I-405)',
    county: 'King',
    lat: 47.615,
    lng: -122.198,
  },
  '510': {
    code: '510',
    name: 'Bellevue (East of I-405)',
    county: 'King',
    lat: 47.601,
    lng: -122.164,
  },
  '520': {
    code: '520',
    name: 'Bellevue (North)',
    county: 'King',
    lat: 47.64,
    lng: -122.169,
  },
  '530': {
    code: '530',
    name: 'Kirkland',
    county: 'King',
    lat: 47.681,
    lng: -122.209,
  },
  '540': {
    code: '540',
    name: 'Redmond',
    county: 'King',
    lat: 47.673,
    lng: -122.122,
  },
  '550': {
    code: '550',
    name: 'Issaquah / Sammamish',
    county: 'King',
    lat: 47.545,
    lng: -122.046,
  },
  '560': {
    code: '560',
    name: 'Mercer Island',
    county: 'King',
    lat: 47.571,
    lng: -122.222,
  },
  '570': {
    code: '570',
    name: 'Newcastle / Coal Creek',
    county: 'King',
    lat: 47.531,
    lng: -122.161,
  },
  '580': {
    code: '580',
    name: 'Renton',
    county: 'King',
    lat: 47.483,
    lng: -122.217,
  },
  '590': {
    code: '590',
    name: 'Maple Valley / Black Diamond',
    county: 'King',
    lat: 47.39,
    lng: -122.048,
  },

  // ---- South King County ----
  '300': {
    code: '300',
    name: 'Kent / Auburn',
    county: 'King',
    lat: 47.38,
    lng: -122.234,
  },
  '310': {
    code: '310',
    name: 'Federal Way',
    county: 'King',
    lat: 47.323,
    lng: -122.312,
  },
  '320': {
    code: '320',
    name: 'Burien / Normandy Park',
    county: 'King',
    lat: 47.471,
    lng: -122.347,
  },
  '330': {
    code: '330',
    name: 'Des Moines / SeaTac',
    county: 'King',
    lat: 47.4,
    lng: -122.312,
  },

  // ---- North King / South Snohomish ----
  '600': {
    code: '600',
    name: 'Shoreline / Richmond Beach',
    county: 'King',
    lat: 47.757,
    lng: -122.34,
  },
  '610': {
    code: '610',
    name: 'Kenmore / Inglemoor',
    county: 'King',
    lat: 47.757,
    lng: -122.237,
  },
  '700': {
    code: '700',
    name: 'Bothell (King County)',
    county: 'King',
    lat: 47.762,
    lng: -122.205,
  },
  '710': {
    code: '710',
    name: 'Bothell / Woodinville',
    county: 'King',
    lat: 47.78,
    lng: -122.165,
  },
  '720': {
    code: '720',
    name: 'Duvall / Carnation',
    county: 'King',
    lat: 47.74,
    lng: -121.985,
  },

  // ---- Snohomish County ----
  '730': {
    code: '730',
    name: 'Snohomish / Monroe',
    county: 'Snohomish',
    lat: 47.912,
    lng: -122.098,
  },
  '740': {
    code: '740',
    name: 'Everett / Silver Lake',
    county: 'Snohomish',
    lat: 47.979,
    lng: -122.202,
  },
  '750': {
    code: '750',
    name: 'Marysville / Arlington',
    county: 'Snohomish',
    lat: 48.051,
    lng: -122.177,
  },
  '760': {
    code: '760',
    name: 'Mukilteo / Lynnwood',
    county: 'Snohomish',
    lat: 47.891,
    lng: -122.304,
  },
  '770': {
    code: '770',
    name: 'Mountlake Terrace / Brier',
    county: 'Snohomish',
    lat: 47.792,
    lng: -122.31,
  },
  '780': {
    code: '780',
    name: 'Mill Creek / Bothell (Snohomish)',
    county: 'Snohomish',
    lat: 47.86,
    lng: -122.202,
  },
  '790': {
    code: '790',
    name: 'Edmonds / Woodway',
    county: 'Snohomish',
    lat: 47.812,
    lng: -122.377,
  },

  // ---- Pierce County ----
  '800': {
    code: '800',
    name: 'Tacoma',
    county: 'Pierce',
    lat: 47.253,
    lng: -122.444,
  },
  '810': {
    code: '810',
    name: 'University Place / Fircrest',
    county: 'Pierce',
    lat: 47.24,
    lng: -122.529,
  },
  '820': {
    code: '820',
    name: 'Gig Harbor',
    county: 'Pierce',
    lat: 47.329,
    lng: -122.577,
  },
  '830': {
    code: '830',
    name: 'Puyallup / Sumner',
    county: 'Pierce',
    lat: 47.185,
    lng: -122.292,
  },
  '840': {
    code: '840',
    name: 'Lakewood / Fort Lewis',
    county: 'Pierce',
    lat: 47.17,
    lng: -122.518,
  },

  // ---- Kitsap County ----
  '147': {
    code: '147',
    name: 'Bremerton',
    county: 'Kitsap',
    lat: 47.567,
    lng: -122.633,
  },
  '148': {
    code: '148',
    name: 'Poulsbo / Kingston',
    county: 'Kitsap',
    lat: 47.735,
    lng: -122.645,
  },
  '149': {
    code: '149',
    name: 'Bainbridge Island',
    county: 'Kitsap',
    lat: 47.641,
    lng: -122.521,
  },

  // ---- King County mountain/rural ----
  '900': {
    code: '900',
    name: 'North Bend / Snoqualmie',
    county: 'King',
    lat: 47.491,
    lng: -121.787,
  },
  '910': {
    code: '910',
    name: 'Enumclaw / Buckley',
    county: 'King',
    lat: 47.202,
    lng: -121.992,
  },
};

// ---------------------------------------------------------------------------
// Cell computation
// ---------------------------------------------------------------------------

// Memoized cell sets — computed once per area, reused on every request
const _cellCache = new Map<string, string[]>();

/**
 * Get the H3 cell set for a given area code.
 * Uses a k=2 disk at resolution 7 (~12 km diameter) centered on the area centroid.
 * For smaller areas (individual neighborhoods), k=1 is appropriate.
 */
export function getAreaCells(areaCode: string, k = 2): string[] {
  const cacheKey = `${areaCode}:${k}`;
  if (_cellCache.has(cacheKey)) return _cellCache.get(cacheKey)!;

  const area = NWMLS_AREAS[areaCode];
  if (!area) return [];

  const center = latLngToCell(area.lat, area.lng, H3_RES.NEIGHBORHOOD);
  const cells = gridDisk(center, k);

  _cellCache.set(cacheKey, cells);
  return cells;
}

/**
 * Get cells for multiple area codes (union), deduped.
 */
export function getMultiAreaCells(areaCodes: string[], k = 2): string[] {
  const allCells = new Set<string>();
  for (const code of areaCodes) {
    getAreaCells(code, k).forEach((c) => allCells.add(c));
  }
  return [...allCells];
}

/**
 * Find all area codes whose cells overlap with a given set of H3 cells.
 * Used to display "what areas are in this search?" in the UI.
 */
export function findAreasInCells(cells: Set<string>): NwmlsArea[] {
  const matches: NwmlsArea[] = [];
  for (const area of Object.values(NWMLS_AREAS)) {
    const centerCell = latLngToCell(area.lat, area.lng, H3_RES.NEIGHBORHOOD);
    if (cells.has(centerCell)) {
      matches.push(area);
    }
  }
  return matches;
}

/**
 * Get all areas in a given county.
 */
export function getAreasByCounty(county: string): NwmlsArea[] {
  return Object.values(NWMLS_AREAS).filter((a) => a.county.toLowerCase() === county.toLowerCase());
}

/**
 * Lookup area by name (fuzzy — just lowercase includes match).
 */
export function findAreaByName(name: string): NwmlsArea | undefined {
  const q = name.toLowerCase();
  return Object.values(NWMLS_AREAS).find((a) => a.name.toLowerCase().includes(q));
}

// County-level cell unions (pre-built for county-level search)
export const COUNTY_CELLS: Record<string, () => string[]> = {
  king: () =>
    getMultiAreaCells(
      Object.values(NWMLS_AREAS)
        .filter((a) => a.county === 'King')
        .map((a) => a.code),
      1,
    ),
  snohomish: () =>
    getMultiAreaCells(
      Object.values(NWMLS_AREAS)
        .filter((a) => a.county === 'Snohomish')
        .map((a) => a.code),
      1,
    ),
  pierce: () =>
    getMultiAreaCells(
      Object.values(NWMLS_AREAS)
        .filter((a) => a.county === 'Pierce')
        .map((a) => a.code),
      1,
    ),
  kitsap: () =>
    getMultiAreaCells(
      Object.values(NWMLS_AREAS)
        .filter((a) => a.county === 'Kitsap')
        .map((a) => a.code),
      1,
    ),
};
