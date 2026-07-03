export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 3;

export const DEFAULT_RESOURCE_EXPANDS: Readonly<Record<string, readonly string[]>> = {
  Member: ['Media'],
  Office: ['Media'],
  Property: ['Media', 'Rooms', 'UnitTypes'],
};

export const MLS_RESOURCE_NAMES = ['Lookup', 'Member', 'Office', 'Property', 'OpenHouse'] as const;
