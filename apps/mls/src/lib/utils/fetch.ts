import { env } from '@kws/config';

import type {
  MlsLookupPayload,
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
import { mlsQuotaTracker } from './quota';
import { throttle } from './rate-limit';

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
    officeMlsId?: string;
    standardStatuses?: string[];
    propertyTypes?: string[];
    afterTimestamp?: Date;
    beforeTimestamp?: Date;
  },
): string {
  const parts: string[] = [
    `OriginatingSystemName eq '${escapeODataString(osn)}'`,
    'MlgCanView eq true',
  ];

  if (options?.standardStatuses && options.standardStatuses.length > 0) {
    if (options.standardStatuses.length === 1) {
      parts.push(`StandardStatus eq '${escapeODataString(options.standardStatuses[0] ?? '')}'`);
    } else {
      const statusClauses = options.standardStatuses
        .map((status) => `StandardStatus eq '${escapeODataString(status)}'`)
        .join(' or ');
      parts.push(`(${statusClauses})`);
    }
  }

  if (options?.propertyTypes && options.propertyTypes.length > 0) {
    if (options.propertyTypes.length === 1) {
      parts.push(`PropertyType eq '${escapeODataString(options.propertyTypes[0] ?? '')}'`);
    } else {
      const typeClauses = options.propertyTypes
        .map((type) => `PropertyType eq '${escapeODataString(type)}'`)
        .join(' or ');
      parts.push(`(${typeClauses})`);
    }
  }

  if (options?.officeMlsId) {
    parts.push(`ListOfficeMlsId eq '${escapeODataString(options.officeMlsId)}'`);
  }

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
    officeMlsId?: string;
    standardStatuses?: string[];
    propertyTypes?: string[];
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

/** Fetch Property records scoped to a single ListOfficeMlsId for initial seed passes. */
export function fetchPropertiesByOffice(
  osn: string,
  officeMlsId: string,
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  return paginate<MlsPropertyPayload>(
    options?.startUrl ??
    buildPropertySeedUrl(osn, getPropertySeedTop(), {
      officeMlsId,
    }),
  );
}

const RESIDENTIAL_PROPERTY_TYPES = [
  'Residential',
  'ResidentialIncome',
  'ResidentialLease',
] as const;

function getPropertySeedTop(): number {
  // Expanded Property pages are heavy; a conservative cap keeps memory and write bursts stable.
  return Math.min(MLS_SYNC_DEFAULTS.maxPageSizeWithExpand, MLS_SYNC_DEFAULTS.pageSize, 500);
}

/**
 * Fetch Property records scoped to residential property types for delta sync.
 * Includes records where MlgCanView is false so that deactivations are
 * processed correctly — only the type filter is applied on top of the
 * standard OriginatingSystemName + ModificationTimestamp delta filter.
 * @yields ODataPageBatch<MlsPropertyPayload> for each page of residential properties.
 */
export async function* fetchResidentialProperties(
  osn: string,
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  const { afterTimestamp, beforeTimestamp, startUrl } = options ?? {};

  if (startUrl) {
    return paginate<MlsPropertyPayload>(startUrl);
  }

  const typeClauses = RESIDENTIAL_PROPERTY_TYPES.map(
    (type) => `PropertyType eq '${escapeODataString(type)}'`,
  ).join(' or ');

  const parts: string[] = [`OriginatingSystemName eq '${escapeODataString(osn)}'`];
  parts.push(`(${typeClauses})`);
  if (afterTimestamp) {
    parts.push(`ModificationTimestamp gt ${afterTimestamp.toISOString()}`);
  }
  if (beforeTimestamp) {
    parts.push(`ModificationTimestamp lt ${beforeTimestamp.toISOString()}`);
  }

  const params = new URLSearchParams({
    $filter: parts.join(' and '),
    $top: String(Math.min(MLS_SYNC_DEFAULTS.maxPageSizeWithExpand, 1000)),
  });

  const expand = getExpandParam('Property');
  if (expand) {
    params.set('$expand', expand);
  }

  yield* paginate<MlsPropertyPayload>(`${baseUrl('Property')}?${params.toString()}`);
}

/**
 * Fetch Property records for multiple property types and standard statuses in a single
 * API request using OData OR clauses. Avoids issuing one request per type.
 * @yields ODataPageBatch<MlsPropertyPayload> for each page of properties matching the criteria.
 */
export async function* fetchViewablePropertiesByTypesAndStatuses(
  osn: string,
  propertyTypes?: readonly string[],
  standardStatuses?: readonly string[],
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  yield* paginate<MlsPropertyPayload>(
    options?.startUrl ??
    buildPropertySeedUrl(osn, getPropertySeedTop(), {
      propertyTypes: propertyTypes ? [...propertyTypes] : undefined,
      standardStatuses: standardStatuses ? [...standardStatuses] : undefined,
      afterTimestamp: options?.afterTimestamp,
      beforeTimestamp: options?.beforeTimestamp,
    }),
  );
}

const INITIAL_PROPERTY_TYPES = ['Residential', 'ResidentialIncome', 'ResidentialLease'] as const;

export async function* fetchPropertiesForInitialSeed(
  osn: string,
  options?: {
    afterTimestamp?: Date;
    beforeTimestamp?: Date;
    startUrl?: string;
  },
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  let resumeStartUrl = options?.startUrl;

  // These loops are intentionally sequential: each segment consumes a paged
  // generator and may carry forward checkpoint URL state into the next segment.
  // Running them in parallel would break deterministic resume ordering.
  /* eslint-disable no-await-in-loop */
  for (const officeMlsId of env.MLS_OFFICE_ID ?? []) {
    for await (const pageBatch of fetchPropertiesByOffice(osn, officeMlsId, {
      afterTimestamp: options?.afterTimestamp,
      beforeTimestamp: options?.beforeTimestamp,
      startUrl: resumeStartUrl,
    })) {
      yield pageBatch;
    }
    resumeStartUrl = undefined;
  }

  for await (const pageBatch of fetchViewablePropertiesByTypesAndStatuses(
    osn,
    INITIAL_PROPERTY_TYPES,
    undefined,
    {
      afterTimestamp: options?.afterTimestamp,
      beforeTimestamp: options?.beforeTimestamp,
      startUrl: resumeStartUrl,
    },
  )) {
    yield pageBatch;
  }

  resumeStartUrl = undefined;
  /* eslint-enable no-await-in-loop */
}
