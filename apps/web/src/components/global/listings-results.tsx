import type { CursorResult, TListingsSearch, TPropertyCard } from '@kws/types';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import React from 'react';
import { BeatLoader } from 'react-spinners';

import {
  hydratedListingsPaginatedInfiniteOptions,
  listingsForSearchAndFilterOptions,
} from '@/features/mls/options/listings';

import ListingsSection from './listings-section';

export function ListingsResults({ params }: { params: Partial<TListingsSearch> }) {
  const pageSize = params.limit ?? 48;
  const MAX_RENDER_PAGES = 6;

  const {
    data: searchResult,
    isPending: isListingsPending,
    isFetching: isListingsFetching,
    refetch: refetchListings,
  } = useQuery(listingsForSearchAndFilterOptions(params));

  const {
    data: hydratedPages,
    isPending: isHydrationPending,
    isFetching: isHydrationFetching,
    isError: isHydrationError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    hydratedListingsPaginatedInfiniteOptions({
      sessionId: searchResult?.sessionId ?? '',
      limit: pageSize,
    }),
  );

  const properties = React.useMemo(() => {
    const pages = hydratedPages?.pages.slice(-MAX_RENDER_PAGES) ?? [];
    const seen = new Set<string>();
    const deduped: TPropertyCard[] = [];

    for (const page of pages) {
      for (const item of page.items) {
        const stableId = (item as TPropertyCard & { id?: unknown }).id;
        const dedupeKey =
          typeof stableId === 'string' && stableId.length > 0
            ? `id:${stableId}`
            : `listing:${item.listingKey}`;

        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        deduped.push(item);
      }
    }

    return deduped;
  }, [hydratedPages?.pages]);

  const recoverySessionRef = React.useRef<string | null>(null);

  const titleCount = searchResult?.total ?? 0;

  const handleLoadMore = React.useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return false;
    }

    void fetchNextPage();

    return true;
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  React.useEffect(() => {
    if (!searchResult?.sessionId) {
      recoverySessionRef.current = null;
      return;
    }

    if (isListingsPending || isListingsFetching || isHydrationPending || isHydrationFetching) {
      return;
    }

    const expectedTotal = searchResult.total ?? 0;
    if (expectedTotal <= properties.length || hasNextPage) {
      return;
    }

    if (recoverySessionRef.current === searchResult.sessionId) {
      return;
    }

    recoverySessionRef.current = searchResult.sessionId;
    void refetchListings();
  }, [
    hasNextPage,
    isHydrationFetching,
    isHydrationPending,
    isListingsFetching,
    isListingsPending,
    properties.length,
    refetchListings,
    searchResult?.sessionId,
    searchResult?.total,
  ]);

  return (
    <>
      {isListingsPending ? (
        <main className='flex h-full min-h-[50vh] w-full flex-1 items-center justify-center py-20'>
          <BeatLoader color='#ff0000' loading={true} size={15} />
        </main>
      ) : null}
      <ListingsSection
        properties={{ items: properties } as CursorResult<TPropertyCard>}
        title={`Search Results ${titleCount ? `(${titleCount})` : ''}`}
        emptyText={
          isHydrationError
            ? 'Property cards failed to load. Please refresh and try again.'
            : isListingsPending || isListingsFetching || isHydrationPending || isHydrationFetching
              ? ''
              : 'There are currently no results to view.'
        }
        pageSize={pageSize}
        hasMore={Boolean(hasNextPage)}
        loadingMore={isFetchingNextPage}
        onLoadMore={handleLoadMore}
      />
    </>
  );
}

export default ListingsResults;
