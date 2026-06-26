import { env } from "@kws/config";

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

interface FetchResourceOptions {
  afterTimestamp?: Date;
  startUrl?: string;
}

export function normalizeFetchResourceOptions(
  optionsOrAfterTimestamp?: FetchResourceOptions | Date,
): FetchResourceOptions {
  if (optionsOrAfterTimestamp instanceof Date) {
    return { afterTimestamp: optionsOrAfterTimestamp };
  }

  return optionsOrAfterTimestamp ?? {};
}

export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

export function splitIntoChunks<T>(values: readonly T[], chunkSize: number): T[][] {
  if (values.length === 0) {
    return [];
  }

  const size = Math.max(1, chunkSize);
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size) as T[]);
  }

  return chunks;
}

