import type { MlsOpenHousePayload, MlsPropertyPayload, ODataPageBatch } from "@/types";
import { env } from "@kws/config";
import { buildResourceUrl, fetchPage, getExpandParam, paginate, type FetchResourceOptions } from "../fetch";
import { baseUrl, escapeODataString, normalizeFetchResourceOptions, splitIntoChunks } from "../helpers";

function buildPropertySeedFilter(
  osn: string,
  options?: {
    standardStatuses?: string[];
    propertyTypes?: string[];
    afterTimestamp?: Date;
  },
): string {
  const parts: string[] = [
    `OriginatingSystemName eq '${escapeODataString(osn)}'`,
    'MlgCanView eq true',
  ];

  if (options?.standardStatuses && options.standardStatuses.length > 0) {
    if (options.standardStatuses.length === 1) {
      parts.push(`StandardStatus eq '${escapeODataString(options.standardStatuses[0] ?? "")}'`);
    } else {
      const statusClauses = options.standardStatuses
        .map((status) => `StandardStatus eq '${escapeODataString(status)}'`)
        .join(' or ');
      parts.push(`(${statusClauses})`);
    }
  }

  if (options?.propertyTypes && options.propertyTypes.length > 0) {
    if (options.propertyTypes.length === 1) {
      parts.push(`PropertyType eq '${escapeODataString(options.propertyTypes[0] ?? "")}'`);
    } else {
      const typeClauses = options.propertyTypes
        .map((type) => `PropertyType eq '${escapeODataString(type)}'`)
        .join(' or ');
      parts.push(`(${typeClauses})`);
    }
  }

  if (options?.afterTimestamp) {
    parts.push(`ModificationTimestamp gt ${options.afterTimestamp.toISOString()}`);
  }

  return parts.join(' and ');
}

export function buildPropertySeedUrl(
  osn: string,
  top: number,
  options?: {
    standardStatuses?: string[];
    propertyTypes?: string[];
    afterTimestamp?: Date;
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



export async function fetchPropertyByListingId(
  osn: string,
  listingId: string,
): Promise<MlsPropertyPayload | null> {
  const params = new URLSearchParams({
    $filter: `OriginatingSystemName eq '${escapeODataString(osn)}' and ListingId eq '${escapeODataString(listingId)}'`,
    $top: '1',
  });

  const expand = getExpandParam('Property');
  if (expand) {
    params.set('$expand', expand);
  }

  const page = await fetchPage<MlsPropertyPayload>(`${baseUrl('Property')}?${params.toString()}`);
  return page.value[0] ?? null;
}

/**
 * Fetch Property records for a targeted set of listing keys.
 * Keys are chunked to keep OData filter query length bounded.
 * @yields ODataPageBatch<MlsPropertyPayload> for each chunk of listing keys.
 */
export async function* fetchPropertiesByListingKeys(
  osn: string,
  listingKeys: readonly string[],
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  const uniqueKeys = [...new Set(listingKeys.filter((key) => key.length > 0))];
  if (uniqueKeys.length === 0) {
    return;
  }

  const keyChunks = splitIntoChunks(uniqueKeys, 75);
  const top = Math.min(env.MLS_MAX_PAGE_SIZE_WITH_EXPAND, 1000);
  const expand = getExpandParam('Property');

  for (const keyChunk of keyChunks) {
    const listingKeyClause = keyChunk
      .map((listingKey) => `ListingKey eq '${escapeODataString(listingKey)}'`)
      .join(' or ');
    const filter = `OriginatingSystemName eq '${escapeODataString(osn)}' and (${listingKeyClause})`;

    const params = new URLSearchParams({
      $filter: filter,
      $top: String(top),
    });

    if (expand) {
      params.set('$expand', expand);
    }

    const url = `${baseUrl('Property')}?${params.toString()}`;
    yield* paginate<MlsPropertyPayload>(url);
  }
}

const RESIDENTIAL_PROPERTY_TYPES = [
  'Residential',
  'ResidentialIncome',
  'ResidentialLease',
] as const;

/**
 * Fetch Property records scoped to residential property types for delta sync.
 * Includes records where MlgCanView is false so that deactivations are
 * processed correctly — only the type filter is applied on top of the
 * standard OriginatingSystemName + ModificationTimestamp delta filter.
 */
export function fetchResidentialProperties(
  osn: string,
  options?: FetchResourceOptions | Date,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  const { afterTimestamp, startUrl } = normalizeFetchResourceOptions(options);

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

  const params = new URLSearchParams({
    $filter: parts.join(' and '),
    $top: String(Math.min(env.MLS_MAX_PAGE_SIZE_WITH_EXPAND, 1000)),
  });

  const expand = getExpandParam('Property');
  if (expand) {
    params.set('$expand', expand);
  }

  return paginate<MlsPropertyPayload>(`${baseUrl('Property')}?${params.toString()}`);
}

/**
 * Fetch Property records for multiple property types and standard statuses in a single
 * API request using OData OR clauses. Avoids issuing one request per type.
 */
export function fetchViewablePropertiesByTypesAndStatuses(
  osn: string,
  propertyTypes: readonly string[],
  standardStatuses: readonly string[],
  options?: FetchResourceOptions,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  return paginate<MlsPropertyPayload>(
    options?.startUrl ??
    buildPropertySeedUrl(osn, Math.min(env.MLS_MAX_PAGE_SIZE_WITH_EXPAND, 1000), {
      propertyTypes: [...propertyTypes],
      standardStatuses: [...standardStatuses],
      afterTimestamp: options?.afterTimestamp,
    }),
  );
}

/** Fetch Property records without $expand for lightweight existence scans. */
export function fetchPropertiesUnexpanded(
  osn: string,
  options?: FetchResourceOptions | Date,
): AsyncGenerator<ODataPageBatch<MlsPropertyPayload>> {
  const { afterTimestamp, startUrl } = normalizeFetchResourceOptions(options);
  return paginate<MlsPropertyPayload>(
    startUrl ??
    buildResourceUrl('Property', osn, afterTimestamp, Math.min(env.MLS_PAGE_SIZE, 5000), {
      includeExpand: false,
    }),
  );
}

/** Fetch OpenHouse records. */
export function fetchOpenHouses(
  osn: string,
  options?: FetchResourceOptions | Date,
): AsyncGenerator<ODataPageBatch<MlsOpenHousePayload>> {
  const { afterTimestamp, startUrl } = normalizeFetchResourceOptions(options);
  return paginate<MlsOpenHousePayload>(
    startUrl ??
    buildResourceUrl('OpenHouse', osn, afterTimestamp, Math.min(env.MLS_PAGE_SIZE, 5000)),
  );
}