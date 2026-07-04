import type { StandardStatus, TListingsSearch, TPropertyCard } from '@kws/types';

import { queryOptions } from '@tanstack/react-query';

import {
  hydrateListingCardsByKeysServerFn,
  searchAllListingMarkersServerFn,
  searchListingMarkersPageServerFn,
  searchListingsCountServerFn,
} from '../functions';

type TSearchScope = {
  search: Partial<TListingsSearch>;
  statuses?: StandardStatus[];
};

type TNormalizedSearchScope = {
  search: Partial<TListingsSearch>;
  statuses?: StandardStatus[];
};

type TSearchPageInput = TSearchScope & {
  limit?: number | null;
  cursor?: string | null;
};

type THydrateCardsInput = {
  listingKeys: string[];
  statuses?: StandardStatus[];
  maxBatchSize?: number;
};

const normalizeStatuses = (statuses?: StandardStatus[]) => {
  if (!statuses?.length) {
    return undefined;
  }

  return [...new Set(statuses)].sort();
};

const normalizeSearchScope = ({ search, statuses }: TSearchScope): TNormalizedSearchScope => ({
  search,
  statuses: normalizeStatuses(statuses),
});

const normalizeSearchScopeForKey = ({ search, statuses }: TSearchScope) => {
  const normalized = normalizeSearchScope({ search, statuses });

  return {
    search: normalized.search,
    statuses: normalized.statuses,
  };
};

const normalizeSearchPageInput = ({ search, statuses, limit, cursor }: TSearchPageInput) => {
  const scope = normalizeSearchScope({ search, statuses });

  return {
    ...scope,
    limit: typeof limit === 'number' ? limit : undefined,
    cursor: cursor ?? undefined,
  };
};

const normalizeHydrateCardsInput = ({
  listingKeys,
  statuses,
  maxBatchSize,
}: THydrateCardsInput) => {
  const uniqueKeys = [...new Set(listingKeys.filter(Boolean))];

  return {
    listingKeys: uniqueKeys,
    statuses: normalizeStatuses(statuses),
    maxBatchSize,
  };
};

export const searchKeys = {
  all: ['search'] as const,
  count: (input: TSearchScope) =>
    [...searchKeys.all, 'count', normalizeSearchScopeForKey(input)] as const,
  markers: (input: TSearchScope) =>
    [...searchKeys.all, 'markers', normalizeSearchScopeForKey(input)] as const,
  markersPage: (input: TSearchPageInput) =>
    [...searchKeys.all, 'markers-page', normalizeSearchPageInput(input)] as const,
  hydrateCards: (input: THydrateCardsInput) =>
    [...searchKeys.all, 'hydrate-cards', normalizeHydrateCardsInput(input)] as const,
  markerCard: (listingKey: string, statuses?: StandardStatus[]) =>
    [...searchKeys.all, 'marker-card', listingKey, normalizeStatuses(statuses)] as const,
} as const;

export const toSearchInput = (
  search: Partial<TListingsSearch>,
  overrides: Partial<{ limit: number | null; cursor: string | null }> = {},
): Partial<TListingsSearch> => ({
  ...search,
  limit: overrides.limit ?? search.limit,
});

export function searchListingsCountOptions(input: TSearchScope) {
  const normalized = normalizeSearchScope(input);

  return queryOptions({
    queryKey: searchKeys.count(input),
    queryFn: ({ signal }) =>
      searchListingsCountServerFn({
        signal,
        data: {
          search: normalized.search,
          statuses: normalized.statuses,
        },
      }),
    staleTime: 60 * 1000,
    gcTime: 60 * 1000 * 5,
    retry: 1,
  });
}

export function searchAllListingMarkersOptions(input: TSearchScope) {
  const normalized = normalizeSearchScope(input);

  return queryOptions({
    queryKey: searchKeys.markers(input),
    queryFn: ({ signal }) =>
      searchAllListingMarkersServerFn({
        signal,
        data: {
          search: normalized.search,
          statuses: normalized.statuses,
        },
      }),
    staleTime: 15 * 1000,
    gcTime: 60 * 1000 * 5,
    retry: 1,
  });
}

export function searchListingMarkersPageOptions(input: TSearchPageInput) {
  const normalized = normalizeSearchPageInput(input);

  return queryOptions({
    queryKey: searchKeys.markersPage(input),
    queryFn: ({ signal }) =>
      searchListingMarkersPageServerFn({
        signal,
        data: {
          search: normalized.search,
          statuses: normalized.statuses,
          limit: normalized.limit,
          cursor: normalized.cursor,
        },
      }),
    staleTime: 15 * 1000,
    gcTime: 60 * 1000 * 5,
    retry: 1,
  });
}

export function hydrateListingCardsByKeysOptions(input: THydrateCardsInput) {
  const normalized = normalizeHydrateCardsInput(input);

  return queryOptions({
    queryKey: searchKeys.hydrateCards(input),
    queryFn: ({ signal }) =>
      hydrateListingCardsByKeysServerFn({
        signal,
        data: {
          listingKeys: normalized.listingKeys,
          statuses: normalized.statuses,
          maxBatchSize: normalized.maxBatchSize,
        },
      }),
    enabled: normalized.listingKeys.length > 0,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000 * 5,
    retry: 1,
  });
}

export function markerCardByListingKeyOptions(listingKey: string, statuses?: StandardStatus[]) {
  return queryOptions({
    queryKey: searchKeys.markerCard(listingKey, statuses),
    queryFn: async ({ signal }): Promise<TPropertyCard | null> => {
      const cards = await hydrateListingCardsByKeysServerFn({
        signal,
        data: {
          listingKeys: [listingKey],
          statuses: normalizeStatuses(statuses),
          maxBatchSize: 1,
        },
      });

      return cards[0] ?? null;
    },
    enabled: Boolean(listingKey),
    staleTime: 60 * 1000,
    gcTime: 60 * 1000 * 10,
    retry: 1,
  });
}

// Backward-compatible aliases for existing caller naming patterns.
export const searchListingsCountFromRouteOptions = (
  search: Partial<TListingsSearch>,
  statuses?: StandardStatus[],
) => searchListingsCountOptions({ search, statuses });

export const searchListingsPageFromRouteOptions = (
  search: Partial<TListingsSearch>,
  input: Partial<Pick<TSearchPageInput, 'limit' | 'cursor' | 'statuses'>> = {},
) =>
  searchListingMarkersPageOptions({
    search,
    statuses: input.statuses,
    limit: input.limit,
    cursor: input.cursor,
  });
