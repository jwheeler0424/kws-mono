import type { MlsLookupPayload, MlsMemberPayload, MlsOfficePayload, MlsPropertyPayload, ODataPage, ODataPageBatch } from "@/types";
import { env } from '@kws/config';
import { DEFAULT_RESOURCE_EXPANDS, MAX_RETRIES, REQUEST_TIMEOUT_MS } from '../constants';
import { logger } from "../logger";
import { MlsApiError } from './errors';
import { baseUrl, getBodyPreview, getResponseBytes, getRetryDelayMs, getSafeEndpoint, normalizeFetchResourceOptions, parseRetryAfterMs, sleep } from "./helpers";
import { mlsQuotaTracker } from "./quota";
import { throttle } from "./rate-limit";


let configuredResourceExpandMap: Readonly<Record<string, readonly string[]>> | null = null;

export function getConfiguredResourceExpandMap(): Readonly<Record<string, readonly string[]>> {
  if (configuredResourceExpandMap) {
    return configuredResourceExpandMap;
  }

  const byResource = new Map<string, string[]>();
  for (const entry of env.MLS_RESOURCE_EXPAND ?? []) {
    const [rawResource, rawExpand] = entry.split(':', 2);
    const resource = rawResource?.trim();
    const expand = rawExpand?.trim();
    if (!resource || !expand) {
      continue;
    }

    const existing = byResource.get(resource) ?? [];
    if (!existing.includes(expand)) {
      existing.push(expand);
    }
    byResource.set(resource, existing);
  }

  const asObject: Record<string, readonly string[]> = {};
  for (const [resource, expands] of byResource.entries()) {
    asObject[resource] = Object.freeze([...expands]);
  }

  configuredResourceExpandMap = Object.freeze(asObject);
  return configuredResourceExpandMap;
}

export function getExpandParam(resource: string): string | null {
  const configured = getConfiguredResourceExpandMap()[resource];
  const expanded =
    configured && configured.length > 0 ? configured : DEFAULT_RESOURCE_EXPANDS[resource];
  if (!expanded || expanded.length === 0) {
    return null;
  }
  return expanded.join(',');
}

export function buildResourceUrl(
  resource: string,
  osn: string,
  afterTimestamp: Date | undefined,
  top: number,
  options?: {
    includeExpand?: boolean;
  },
) {
  const params = new URLSearchParams({
    $filter: buildFilter(osn, afterTimestamp),
    $top: String(top),
  });

  if (options?.includeExpand !== false) {
    const expand = getExpandParam(resource);
    if (expand) {
      params.set('$expand', expand);
    }
  }

  return `${baseUrl(resource)}?${params.toString()}`;
}

export function buildFilter(osn: string, afterTimestamp?: Date): string {
  const parts: string[] = [`OriginatingSystemName eq '${osn}'`];
  if (afterTimestamp) {
    parts.push(`ModificationTimestamp gt ${afterTimestamp.toISOString()}`);
  }
  return parts.join(' and ');
}

export async function* paginate<T>(initialUrl: string): AsyncGenerator<ODataPageBatch<T>> {
  let url: string | undefined = initialUrl;
  while (url) {
    const requestUrl = url;
    const page: ODataPage<T> = await fetchPage<T>(url);
    const nextUrl = page['@odata.nextLink'];
    if (page.value.length > 0) {
      yield {
        value: page.value,
        requestUrl,
        nextUrl,
      };
    }
    url = nextUrl;
  }
}

// ---------------------------------------------------------------------------
// fetchPage — core primitive used by the resource generators
// ---------------------------------------------------------------------------

export async function fetchPage<T>(url: string): Promise<ODataPage<T>> {
  await throttle();

  let attempt = 0;
  const endpoint = getSafeEndpoint(url);

  while (true) {
    let res: Response;

    try {
      logger.trace('mls api request started', {
        endpoint,
        attempt: attempt + 1,
      });
      mlsQuotaTracker.prepareRequest();
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.MLS_ACCESS_KEY}`,
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // Network-level error (timeout, DNS, etc.)
      if (attempt < MAX_RETRIES) {
        logger.debug('mls api request retrying after transport failure', {
          endpoint,
          attempt: attempt + 1,
          error: err instanceof Error ? err.message : String(err),
        });
        attempt++;
        const backoff = Math.min(1_000 * 2 ** attempt + Math.random() * 500, 30_000);
        await sleep(backoff);
        await throttle();
        continue;
      }
      logger.error('mls api request failed before response', {
        endpoint,
        attempt: attempt + 1,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    const body = await res.text().catch(() => '<no body>');
    const responseBytes = getResponseBytes(res, body);
    mlsQuotaTracker.recordResponseBytes(responseBytes);

    if (res.ok) {
      logger.debug('mls api request completed', {
        endpoint,
        attempt: attempt + 1,
        status: res.status,
        responseBytes,
      });
      try {
        return JSON.parse(body) as ODataPage<T>;
      } catch (err) {
        const contentType = res.headers.get('content-type') ?? '<missing>';
        const bodyPreview = getBodyPreview(body);

        if (attempt < MAX_RETRIES) {
          attempt++;
          const delayMs = Math.min(1_000 * 2 ** attempt + Math.random() * 500, 30_000);
          logger.warn('mls api response parse failed, retrying', {
            endpoint,
            status: res.status,
            attempt,
            contentType,
            bodyPreview,
            retryAfterMs: delayMs,
          });
          await sleep(delayMs);
          await throttle();
          continue;
        }

        logger.error('mls api response parse failed', {
          endpoint,
          status: res.status,
          attempt: attempt + 1,
          contentType,
          bodyPreview,
        });

        throw new Error(
          `MLS API parse failure at ${endpoint} (content-type: ${contentType}, body preview: ${bodyPreview})`,
          { cause: err },
        );
      }
    }

    const contentType = res.headers.get('content-type') ?? '<missing>';
    const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
    const requestId =
      res.headers.get('x-request-id') ??
      res.headers.get('x-amzn-requestid') ??
      res.headers.get('cf-ray') ??
      null;
    const bodyPreview = getBodyPreview(body, 240);

    // Retriable: rate-limited or server error
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      attempt++;
      const delayMs = getRetryDelayMs(res, attempt);
      logger.debug('mls api request retry scheduled', {
        endpoint,
        status: res.status,
        attempt,
        retryAfterMs: delayMs,
        contentType,
        requestId,
        bodyPreview,
      });
      if (res.status === 429) {
        logger.warn('mls api rate limited', {
          status: res.status,
          retryAfterMs: delayMs,
          attempt,
        });
      }
      await sleep(delayMs);
      await throttle();
      continue;
    }

    logger.error('mls api request failed', {
      endpoint,
      status: res.status,
      attempt: attempt + 1,
      responseBytes,
      contentType,
      retryAfterMs,
      requestId,
      bodyPreview,
    });

    // Omit URL from error message to avoid token leakage in query strings
    throw new MlsApiError(res.status, endpoint, body, bodyPreview);
  }
}

export interface FetchResourceOptions {
  afterTimestamp?: Date;
  startUrl?: string;
}

/** Fetch Lookup records, optionally filtered to records modified after a timestamp. */
export function fetchLookups(
  osn: string,
  options?: FetchResourceOptions | Date,
): AsyncGenerator<ODataPageBatch<MlsLookupPayload>> {
  const { afterTimestamp, startUrl } = normalizeFetchResourceOptions(options);
  return paginate<MlsLookupPayload>(
    startUrl ??
    buildResourceUrl('Lookup', osn, afterTimestamp, Math.min(env.MLS_PAGE_SIZE, 5000)),
  );
}

/** Fetch Member records with expanded Media. */
export function fetchMembers(
  osn: string,
  options?: FetchResourceOptions | Date,
): AsyncGenerator<ODataPageBatch<MlsMemberPayload>> {
  const { afterTimestamp, startUrl } = normalizeFetchResourceOptions(options);
  return paginate<MlsMemberPayload>(
    startUrl ??
    buildResourceUrl(
      'Member',
      osn,
      afterTimestamp,
      Math.min(env.MLS_MAX_PAGE_SIZE_WITH_EXPAND, 1000),
    ),
  );
}

/** Fetch Office records with expanded Media. */
export function fetchOffices(
  osn: string,
  options?: FetchResourceOptions | Date,
): AsyncGenerator<ODataPageBatch<MlsOfficePayload>> {
  const { afterTimestamp, startUrl } = normalizeFetchResourceOptions(options);
  return paginate<MlsOfficePayload>(
    startUrl ??
    buildResourceUrl(
      'Office',
      osn,
      afterTimestamp,
      Math.min(env.MLS_MAX_PAGE_SIZE_WITH_EXPAND, 1000),
    ),
  );
}

/** Fetch Property records with expanded Media, Rooms, and UnitTypes.
 *  Page size is capped at maxPageSizeWithExpand (1000) per API limits. */
export function fetchProperties(
  osn: string,
  options?: FetchResourceOptions | Date,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  const { afterTimestamp, startUrl } = normalizeFetchResourceOptions(options);
  return paginate<MlsPropertyPayload>(
    startUrl ??
    buildResourceUrl(
      'Property',
      osn,
      afterTimestamp,
      Math.min(env.MLS_MAX_PAGE_SIZE_WITH_EXPAND, 1000),
    ),
  );
}