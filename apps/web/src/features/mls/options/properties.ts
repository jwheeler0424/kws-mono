import type { PropertyParams } from '@kws/types';

import { queryOptions } from '@tanstack/react-query';

import {
  getAvailablePropertiesServerFn,
  getFeaturedPropertiesServerFn,
  getPendingPropertiesServerFn,
  getSoldPropertiesServerFn,
} from '../functions';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const propertiesKeys = {
  all: ['properties'] as const,
  featured: (params?: PropertyParams) => [...propertiesKeys.all, 'featured', params] as const,
  available: (params?: PropertyParams) => [...propertiesKeys.all, 'available', params] as const,
  pending: (params?: PropertyParams) => [...propertiesKeys.all, 'pending', params] as const,
  sold: (params?: PropertyParams) => [...propertiesKeys.all, 'sold', params] as const,
} as const;

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Query options for featured property cards (Active, ActiveUnderContract,
 * ComingSoon). Use this for the "Available Listings" section of a property
 * page.
 */
export function featuredPropertiesOptions(params: PropertyParams = {}) {
  return queryOptions({
    queryKey: propertiesKeys.featured(params),
    queryFn: ({ signal }) => getFeaturedPropertiesServerFn({ signal, data: params }),
    staleTime: 60 * 1000 * 5, // 5 min
    gcTime: 60 * 1000 * 10, // 10 min
    retry: 1,
  });
}

/**
 * Query options for available property cards (Active, ActiveUnderContract,
 * ComingSoon). Use this for the "Available Listings" section of a property
 * page.
 */
export function availablePropertiesOptions(params: PropertyParams = {}) {
  return queryOptions({
    queryKey: propertiesKeys.available(params),
    queryFn: ({ signal }) => getAvailablePropertiesServerFn({ signal, data: params }),
    staleTime: 60 * 1000 * 5, // 5 min
    gcTime: 60 * 1000 * 10, // 10 min
    retry: 1,
  });
}

/**
 * Query options for pending property cards (Pending). Use this for the
 * "Pending" or "Under Contract" section of a property page.
 */
export function pendingPropertiesOptions(params: PropertyParams = {}) {
  return queryOptions({
    queryKey: propertiesKeys.pending(params),
    queryFn: ({ signal }) => getPendingPropertiesServerFn({ signal, data: params }),
    staleTime: 60 * 1000 * 5, // 5 min
    gcTime: 60 * 1000 * 10, // 10 min
    retry: 1,
  });
}

/**
 * Query options for sold property cards (Closed). Use this for the "Recently
 * Sold" section of a property page.
 *
 * Sold listings change less frequently so stale time is longer.
 */
export function soldPropertiesOptions(params: PropertyParams = {}) {
  return queryOptions({
    queryKey: propertiesKeys.sold(params),
    queryFn: ({ signal }) => getSoldPropertiesServerFn({ signal, data: params }),
    staleTime: 60 * 1000 * 30, // 30 min — sold listings rarely change
    gcTime: 60 * 1000 * 15, // 15 min
    retry: 1,
  });
}
