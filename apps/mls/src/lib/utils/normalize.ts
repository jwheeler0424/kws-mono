import { isMissing } from '@kws/utils';

// ---------------------------------------------------------------------------
// Normalization helpers — pure boundary functions for MLS API → local DB
// ---------------------------------------------------------------------------
// These are the ONLY trusted path from raw OData values to local column types.
// All helpers accept `unknown` and return null for missing / invalid input.
// ---------------------------------------------------------------------------

function stripNullBytes(value: string): string {
  const index = value.indexOf('\0');
  if (index === -1) return value;

  let result = value.slice(0, index);

  for (let i = index + 1; i < value.length; i++) {
    if (value.charCodeAt(i) !== 0) {
      result += value[i];
    }
  }

  return result;
}

function normalizeStringValue(value: string): string {
  let s = value;

  if (s.includes('\0')) {
    s = stripNullBytes(s);
  }

  const first = s.charCodeAt(0);
  const last = s.charCodeAt(s.length - 1);

  if (
    first <= 32 ||
    last <= 32
  ) {
    s = s.trim();
  }

  return s;
}

export function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripNullBytes(value);
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = sanitizeJsonValue(value[i]);
    }
    return value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const obj = value as Record<string, unknown>;

  for (const key in obj) {
    obj[key] = sanitizeJsonValue(obj[key]);
  }

  return obj;
}

export function sanitizeJsonObject(value: Record<string, unknown>): Record<string, unknown> {
  return sanitizeJsonValue(value) as Record<string, unknown>;
}

export function parseTimestamp(v: unknown): string | null {
  if (isMissing(v)) return null;
  if (typeof v !== 'string') return null;
  return v;
}

/**
 * Parse a numeric value into a decimal string compatible with Postgres
 * `numeric` columns. Returns null for missing or non-numeric input.
 */
export function parseNumeric(v: unknown): string | null {
  if (isMissing(v)) return null;

  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : null;
  }

  if (typeof v !== 'string') return null;

  const s = v.trim();
  if (!s) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  return s;
}

/** Parse a boolean or boolean-like string. Returns null if indeterminate. */
const TRUE_VALUES = new Set(['true', '1', 'y', 'yes']);
const FALSE_VALUES = new Set(['false', '0', 'n', 'no']);

export function parseBoolean(v: unknown): boolean | null {
  if (v == null) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
    return null;
  }

  if (typeof v !== 'string') return null;

  const normalized = v.trim().toLowerCase();

  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return null;
}

/**
 * Parse an array of strings. Accepts an actual string[], a comma-separated
 * string, or a single string. Returns null for empty or missing input.
 */
export function parseStringArray(v: unknown): string[] | null {
  if (isMissing(v)) return null;
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
  if (isMissing(v)) return null;
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return null;
  const s = normalizeStringValue(`${v}`);
  if (s.length === 0) return null;
  return maxLength !== undefined ? s.slice(0, maxLength) : s;
}

/** Parse an integer value. Returns null for missing or non-integer input. */
export function parseIntegerValue(v: unknown): number | null {
  if (isMissing(v)) return null;
  if (typeof v !== 'string' && typeof v !== 'number') return null;

  const n = Number(v);

  return Number.isInteger(n) ? n : null;
}

/** Parse a floating-point number. Returns null for missing or NaN input. */
export function parseRealNumber(v: unknown): number | null {
  if (isMissing(v)) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

export function parseLocalFields(payload: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const normalizedPrefix = prefix.endsWith('_')
    ? prefix
    : `${prefix}_`;

  const result: Record<string, unknown> = {};

  for (const key in payload) {
    if (key.startsWith(normalizedPrefix)) {
      result[key] = payload[key];
    }
  }

  return result;
}