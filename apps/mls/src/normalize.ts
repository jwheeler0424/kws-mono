// ---------------------------------------------------------------------------
// Normalization helpers — pure boundary functions for MLS API → local DB
// ---------------------------------------------------------------------------
// These are the ONLY trusted path from raw OData values to local column types.
// All helpers accept `unknown` and return null for missing / invalid input.
// ---------------------------------------------------------------------------

function stripNullBytes(value: string): string {
  return value.split('\0').join('');
}

function normalizeStringValue(value: string): string {
  return stripNullBytes(value).trim();
}

export function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripNullBytes(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = sanitizeJsonValue(nestedValue);
  }
  return sanitized;
}

export function sanitizeJsonObject(value: Record<string, unknown>): Record<string, unknown> {
  return sanitizeJsonValue(value) as Record<string, unknown>;
}

/** Parse an ISO 8601 string or Date-like value into a Date, or null. */
export function parseTimestamp(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v;
  }
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a numeric value into a decimal string compatible with Postgres
 * `numeric` columns. Returns null for missing or non-numeric input.
 */
export function parseNumeric(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const n = Number(v);
  if (!isFinite(n)) return null;
  return typeof v === 'number' ? String(v) : v.trim();
}

/** Parse a boolean or boolean-like string. Returns null if indeterminate. */
export function parseBoolean(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return null;
}

/**
 * Parse an array of strings. Accepts an actual string[], a comma-separated
 * string, or a single string. Returns null for empty or missing input.
 */
export function parseStringArray(v: unknown): string[] | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const result = v
      .filter((item) => item !== null && item !== undefined)
      .map((item) => normalizeStringValue(String(item)))
      .filter((item) => item.length > 0);
    return result.length > 0 ? result : null;
  }
  if (typeof v === 'string') {
    const normalized = normalizeStringValue(v);
    return normalized.length > 0 ? [normalized] : null;
  }
  return null;
}

/**
 * Coerce a value to a string, returning null for empty / missing values.
 * Optionally truncates to maxLength to protect against oversized inputs.
 */
export function parseNullableString(v: unknown, maxLength?: number): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return null;
  const s = normalizeStringValue(`${v}`);
  if (s.length === 0) return null;
  return maxLength !== undefined ? s.slice(0, maxLength) : s;
}

/** Parse an integer value. Returns null for missing or non-integer input. */
export function parseIntegerValue(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const n = parseInt(typeof v === 'number' ? String(v) : v, 10);
  return isNaN(n) ? null : n;
}

/** Parse a floating-point number. Returns null for missing or NaN input. */
export function parseRealNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
