import { env } from '@kws/config';

import type {
  MlsLookupPayload,
  MlsMediaPayload,
  MlsMemberPayload,
  MlsOfficePayload,
  MlsOpenHousePayload,
  MlsPropertyPayload,
  MlsResource,
  ODataPage,
  ODataPageBatch,
} from '@/types';

import {
  DEFAULT_RESOURCE_EXPANDS,
  MAX_RETRIES,
  MLS_MEDIA_BUDGET_DEFAULTS,
  MLS_SYNC_DEFAULTS,
  REQUEST_TIMEOUT_MS,
} from '../constants';
import { logger } from '../logger';
import { MlsApiError } from './errors';
import {
  baseUrl,
  escapeODataString,
  getBodyPreview,
  getResponseBytes,
  getRetryDelayMs,
  getSafeEndpoint,
  parseRetryAfterMs,
  sleep,
} from './helpers';
import { MlsQuotaExceededError, mlsQuotaTracker } from './quota';
import { throttle } from './rate-limit';

export class MlsParentUnavailableError extends Error {
  readonly retryAfterMs = MLS_MEDIA_BUDGET_DEFAULTS.parentUnavailableRetryMs;

  constructor() {
    super('Fresh MLS media snapshot is missing or not authorized for IDX');
    this.name = 'MlsParentUnavailableError';
  }
}

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

export function getExpandParam(resource: MlsResource): string | null {
  const configured = getConfiguredResourceExpandMap()[resource];
  const expanded =
    configured && configured.length > 0 ? configured : DEFAULT_RESOURCE_EXPANDS[resource];
  if (!expanded || expanded.length === 0) {
    return null;
  }
  return expanded.join(',');
}

export function buildResourceUrl({
  resource,
  osn,
  beforeTimestamp,
  afterTimestamp,
  top,
  options,
}: {
  resource: MlsResource;
  osn: string;
  beforeTimestamp?: Date | undefined;
  afterTimestamp: Date | undefined;
  top: number;
  options?: {
    includeExpand?: boolean;
  };
}) {
  const params = new URLSearchParams({
    $filter: buildFilter(osn, afterTimestamp, beforeTimestamp),
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

export function buildFilter(osn: string, afterTimestamp?: Date, beforeTimestamp?: Date): string {
  const parts: string[] = [`OriginatingSystemName eq '${osn}'`];
  if (afterTimestamp) {
    parts.push(`ModificationTimestamp gt ${afterTimestamp.toISOString()}`);
  }
  if (beforeTimestamp) {
    parts.push(`ModificationTimestamp lt ${beforeTimestamp.toISOString()}`);
  }
  return parts.join(' and ');
}

export function buildFreshParentMediaUrl(
  entityType: 'properties' | 'members' | 'offices',
  recordKey: string,
  listingId?: string | null,
): string {
  if (entityType === 'properties' && !listingId) {
    throw new Error('MLS Property media lookup requires the prefixed ListingId');
  }
  const [resource, keyField] =
    entityType === 'properties'
      ? ['Property', 'ListingId']
      : entityType === 'members'
        ? ['Member', 'MemberMlsId']
        : ['Office', 'OfficeMlsId'];
  const filterKey = entityType === 'properties' ? listingId! : recordKey;
  const params = new URLSearchParams({
    $filter: `OriginatingSystemName eq '${escapeODataString(env.MLS_ORIGINATING_SYSTEM_NAME)}' and ${keyField} eq '${escapeODataString(filterKey)}'`,
    $expand: 'Media',
    $top: '1',
  });
  return `${baseUrl(resource as MlsResource)}?${params.toString()}`;
}

export async function fetchFreshParentMedia(
  entityType: 'properties' | 'members' | 'offices',
  recordKey: string,
  listingId?: string | null,
): Promise<MlsMediaPayload[]> {
  const page = await fetchPage<{
    ListingKey?: string;
    MlgCanView?: boolean;
    MlgCanUse?: string[];
    Media?: MlsMediaPayload[];
  }>(buildFreshParentMediaUrl(entityType, recordKey, listingId));
  const parent = page.value[0];
  if (
    !parent ||
    (entityType === 'properties' && parent.ListingKey !== recordKey) ||
    parent.MlgCanView !== true ||
    (parent.MlgCanUse && !parent.MlgCanUse.includes('IDX')) ||
    !Array.isArray(parent.Media)
  ) {
    throw new MlsParentUnavailableError();
  }
  return parent.Media;
}

export async function* paginate<T>(initialUrl: string): AsyncGenerator<ODataPageBatch<T>> {
  let url: string | undefined = initialUrl;
  while (url) {
    const requestUrl = url;
    const page: ODataPage<T> = await fetchPage<T>(url);
    const nextUrl = page['@odata.nextLink'];
    yield { value: page.value, requestUrl, nextUrl };
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
      if (err instanceof MlsQuotaExceededError) {
        throw err;
      }
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
  beforeTimestamp?: Date;
  startUrl?: string;
}

/** Fetch Lookup records, optionally filtered to records modified after a timestamp. */
export function fetchLookups(
  osn: string,
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsLookupPayload>> {
  const { afterTimestamp, beforeTimestamp, startUrl } = options ?? {};
  return paginate<MlsLookupPayload>(
    startUrl ??
      buildResourceUrl({
        resource: 'Lookup',
        osn,
        afterTimestamp,
        beforeTimestamp,
        top: Math.min(MLS_SYNC_DEFAULTS.pageSize, 5000),
      }),
  );
}

/** Fetch Member records with expanded Media. */
export function fetchMembers(
  osn: string,
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsMemberPayload>> {
  const { afterTimestamp, beforeTimestamp, startUrl } = options ?? {};
  return paginate<MlsMemberPayload>(
    startUrl ??
      buildResourceUrl({
        resource: 'Member',
        osn,
        afterTimestamp,
        beforeTimestamp,
        top: Math.min(MLS_SYNC_DEFAULTS.maxPageSizeWithExpand, 1000),
      }),
  );
}

/** Fetch Office records with expanded Media. */
export function fetchOffices(
  osn: string,
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsOfficePayload>> {
  const { afterTimestamp, beforeTimestamp, startUrl } = options ?? {};
  return paginate<MlsOfficePayload>(
    startUrl ??
      buildResourceUrl({
        resource: 'Office',
        osn,
        afterTimestamp,
        beforeTimestamp,
        top: Math.min(MLS_SYNC_DEFAULTS.maxPageSizeWithExpand, 1000),
      }),
  );
}

export function fetchOpenHouses(
  osn: string,
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsOpenHousePayload>> {
  const { afterTimestamp, beforeTimestamp, startUrl } = options ?? {};
  return paginate<MlsOpenHousePayload>(
    startUrl ??
      buildResourceUrl({
        resource: 'OpenHouse',
        osn,
        afterTimestamp,
        beforeTimestamp,
        top: Math.min(MLS_SYNC_DEFAULTS.maxPageSizeWithExpand, 1000),
      }),
  );
}

function buildPropertySeedFilter(
  osn: string,
  options?: {
    afterTimestamp?: Date;
    beforeTimestamp?: Date;
  },
): string {
  const parts: string[] = [
    `OriginatingSystemName eq '${escapeODataString(osn)}'`,
    'MlgCanView eq true',
  ];

  if (options?.afterTimestamp) {
    parts.push(`ModificationTimestamp gt ${options.afterTimestamp.toISOString()}`);
  }
  if (options?.beforeTimestamp) {
    parts.push(`ModificationTimestamp lt ${options.beforeTimestamp.toISOString()}`);
  }

  return parts.join(' and ');
}

export function buildPropertySeedUrl(
  osn: string,
  top: number,
  options?: {
    afterTimestamp?: Date;
    beforeTimestamp?: Date;
  },
): string {
  const params = new URLSearchParams({
    $filter: buildPropertySeedFilter(osn, options),
    $top: String(top),
  });

  const expand = getExpandParam('Property');
  if (expand) {
    params.set('$expand', expand);
  }

  return `${baseUrl('Property')}?${params.toString()}`;
}

function getPropertySeedTop(): number {
  // Expanded Property pages are heavy; a conservative cap keeps memory and write bursts stable.
  return Math.min(MLS_SYNC_DEFAULTS.maxPageSizeWithExpand, MLS_SYNC_DEFAULTS.pageSize, 500);
}

/**
 * Fetch residential Property records for delta sync. Property type filtering
 * stays local because replication requests only support limited filter fields.
 * @yields Filtered Property pages from MLS Grid.
 */
export async function* fetchResidentialProperties(
  osn: string,
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  const { afterTimestamp, beforeTimestamp, startUrl } = options ?? {};
  const initialUrl =
    startUrl ??
    buildResourceUrl({
      resource: 'Property',
      osn,
      afterTimestamp,
      beforeTimestamp,
      top: Math.min(MLS_SYNC_DEFAULTS.maxPageSizeWithExpand, 1000),
    });

  for await (const pageBatch of paginate<MlsPropertyPayload>(initialUrl)) {
    yield pageBatch;
  }
}

export async function* fetchPropertiesForInitialSeed(
  osn: string,
  options?: {
    afterTimestamp?: Date;
    beforeTimestamp?: Date;
    startUrl?: string;
  },
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  yield* paginate<MlsPropertyPayload>(
    options?.startUrl ??
      buildPropertySeedUrl(osn, getPropertySeedTop(), {
        afterTimestamp: options?.afterTimestamp,
        beforeTimestamp: options?.beforeTimestamp,
      }),
  );
}
