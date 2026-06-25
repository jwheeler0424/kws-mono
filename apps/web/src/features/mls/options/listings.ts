import { queryOptions } from '@tanstack/react-query';
import { getListingDetailsServerFn, getListingMarkersServerFn } from '../functions';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const ListingsKeys = {
  all: ['listings'] as const,
  detail: (listingKey: string) => [...ListingsKeys.all, 'detail', listingKey] as const,
  markers: () => [...ListingsKeys.all, 'markers'] as const,
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

export function listingMarkersOptions() {
  return queryOptions({
    queryKey: ListingsKeys.markers(),
    queryFn: ({ signal }) => getListingMarkersServerFn({ signal }),
    staleTime: 60 * 1000 * 5, // 5 min
    gcTime: 60 * 1000 * 10, // 10 min
    retry: 1,
  });
}