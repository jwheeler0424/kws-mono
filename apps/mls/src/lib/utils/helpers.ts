import { env } from '@kws/config';
import { getColumns, sql, type SQL, type Table } from 'drizzle-orm';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function baseUrl(resource: string): string {
  return `${env.MLS_API_URL.replace(/\/$/, '')}/${resource}`;
}

export function getSafeEndpoint(url: string): string {
  return url.split('?')[0] ?? url;
}

export function getResponseBytes(res: Response, body: string): number {
  const contentLength = res.headers.get('content-length');
  const parsedLength = contentLength ? Number(contentLength) : NaN;
  if (Number.isFinite(parsedLength) && parsedLength >= 0) {
    return parsedLength;
  }

  return new TextEncoder().encode(body).byteLength;
}

export function parseRetryAfterMs(
  headerValue: string | null,
  nowMs: number = Date.now(),
): number | null {
  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const when = Date.parse(headerValue);
  if (!Number.isNaN(when)) {
    return Math.max(0, when - nowMs);
  }

  return null;
}

export function getRetryDelayMs(res: Response, attempt: number): number {
  const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
  if (retryAfterMs !== null) {
    return retryAfterMs;
  }

  return Math.min(1_000 * 2 ** attempt + Math.random() * 500, 30_000);
}

export function getBodyPreview(body: string, maxChars: number = 120): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxChars) {
    return compact;
  }

  return `${compact.slice(0, maxChars)}...`;
}

export function startOfUtcHour(nowMs: number): number {
  const date = new Date(nowMs);
  date.setUTCMinutes(0, 0, 0);
  return date.getTime();
}

export function startOfUtcDay(nowMs: number): number {
  const date = new Date(nowMs);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
}

/**
 * Dedupe records by a derived key while preserving deterministic write order.
 * The last occurrence wins so later records in a payload overwrite earlier ones.
 */
export function dedupeByKey<T>(records: readonly T[], getKey: (record: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const record of records) {
    const key = getKey(record);
    if (!key) continue;
    byKey.set(key, record);
  }
  return Array.from(byKey.values());
}

/**
 * Generates a dynamic set object for mass upserts via .onConflictDoUpdate()
 * * @param table - The Drizzle schema table object
 * @param excludeColumns - Array of column keys to ignore (e.g., primary keys, generated columns)
 */
export function getUpsertSetFields<TTable extends Table>(
  table: TTable,
  // Drizzle stores its schema shape inside the '_' metadata property
  excludeColumns: (keyof TTable['_']['columns'])[] = [],
): Record<string, SQL> {
  const allColumns = getColumns(table);

  return Object.keys(allColumns).reduce(
    (acc, key) => {
      // We assert excludeColumns as string[] just to satisfy TS for the .includes() check
      if (!(excludeColumns as string[]).includes(key)) {
        const dbColumnName = allColumns[key]?.name;

        if (dbColumnName) {
          acc[key] = sql.raw(`excluded.${dbColumnName}`);
        }
      }
      return acc;
    },
    {} as Record<string, SQL>,
  );
}
