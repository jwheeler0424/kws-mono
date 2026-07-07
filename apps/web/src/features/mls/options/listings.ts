import type { TListingsSearch } from '@kws/types';

import { isValidMapBounds } from '@kws/types';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import {
  getHydratedListingsPaginatedServerFn,
  getListingDetailsServerFn,
  getListingsForSearchAndFilterServerFn,
} from '../functions';

type TRangeInput =
  | {
    min?: number | null;
    max?: number | null;
  }
  | null
  | undefined;

function normalizeRange(range: TRangeInput) {
  if (!range) {
    return undefined;
  }

  const min = typeof range.min === 'number' ? range.min : null;
  const max = typeof range.max === 'number' ? range.max : null;

  if (min === null && max === null) {
    return undefined;
  }

  return {
    min,
    max,
  };
}

export function normalizeListingsSearchInput(input: Partial<TListingsSearch>): Partial<TListingsSearch> {
  const query = typeof input.query === 'string' ? input.query.trim() : undefined;
  const price = normalizeRange(input.price);
  const sqFt = normalizeRange(input.sqFt);
  const bedrooms = normalizeRange(input.bedrooms);
  const bathrooms = normalizeRange(input.bathrooms);
  const hasProximity =
    typeof input.proximity?.lat === 'number' &&
    typeof input.proximity?.lng === 'number' &&
    typeof input.proximity?.radiusMiles === 'number';
  const useMapBounds = input.useMapBounds === true;
  const bounds = useMapBounds && input.bounds && isValidMapBounds(input.bounds) ? input.bounds : undefined;

  return {
    query: query && query.length > 0 ? query : undefined,
    limit: typeof input.limit === 'number' ? input.limit : undefined,
    price,
    sqFt,
    bedrooms,
    bathrooms,
    useMapBounds: bounds ? true : undefined,
    bounds,
    sortBy: input.sortBy ?? undefined,
    proximity: hasProximity ? input.proximity : undefined,
  };
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const ListingsKeys = {
  all: ['listings'] as const,
  detail: (listingKey: string) => [...ListingsKeys.all, 'detail', listingKey] as const,
  searchAndFilter: (input: Partial<TListingsSearch>) =>
    [...ListingsKeys.all, 'search-and-filter', normalizeListingsSearchInput(input)] as const,
  hydratedPaginated: (input: { sessionId: string; limit?: number | null }) =>
    [...ListingsKeys.all, 'hydrated-paginated', input] as const,
} as const;

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Query options for featured property cards (Active, ActiveUnderContract,
 * ComingSoon). Use this for the "Available Listings" section of a property
 * page.
 */
export function listingDetailOptions(params: { listingKey: string }) {
  return queryOptions({
    queryKey: ListingsKeys.detail(params.listingKey),
    queryFn: ({ signal }) => getListingDetailsServerFn({ signal, data: params }),
    staleTime: 60 * 1000 * 5, // 5 min
    gcTime: 60 * 1000 * 10, // 10 min
    retry: 1,
  });
}

export function listingsForSearchAndFilterOptions(input: Partial<TListingsSearch>) {
  const normalizedInput = normalizeListingsSearchInput(input);

  return queryOptions({
    queryKey: ListingsKeys.searchAndFilter(normalizedInput),
    queryFn: ({ signal }) =>
      getListingsForSearchAndFilterServerFn({
        signal,
        data: normalizedInput,
      }),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    structuralSharing: false,
    refetchOnMount: false,
    retry: 1,
  });
}

export function hydratedListingsPaginatedInfiniteOptions(input: {
  sessionId: string;
  limit?: number | null;
}) {
  return infiniteQueryOptions({
    queryKey: ListingsKeys.hydratedPaginated(input),
    queryFn: ({ signal, pageParam }) =>
      getHydratedListingsPaginatedServerFn({
        signal,
        data: {
          sessionId: input.sessionId,
          limit: input.limit,
          cursor: pageParam,
        },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : null),
    maxPages: 8,
    enabled: input.sessionId.length > 0,
    staleTime: 15 * 1000,
    gcTime: 60 * 1000 * 5,
    retry: 1,
  });
}
