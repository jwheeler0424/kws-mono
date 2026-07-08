import type { TPropertyCard } from '@kws/schema';
import type { CursorResult, TListingsSearch } from '@kws/types';

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

  const isResolvingResults =
    isListingsPending || isListingsFetching || isHydrationPending || isHydrationFetching;
  const [displayedProperties, setDisplayedProperties] = React.useState<TPropertyCard[]>([]);

  React.useEffect(() => {
    if (properties.length > 0) {
      setDisplayedProperties(properties);
      return;
    }

    if (!isResolvingResults) {
      setDisplayedProperties([]);
    }
  }, [isResolvingResults, properties]);

  const shouldShowPrimaryLoader = isResolvingResults && displayedProperties.length === 0;
  const shouldShowOverlayLoader = isResolvingResults && displayedProperties.length > 0;

  const titleCount = searchResult?.total ?? 0;

  const handleLoadMore = React.useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return false;
    }

    void fetchNextPage();

    return true;
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      {shouldShowPrimaryLoader ? (
        <main className='flex h-full min-h-[50vh] w-full flex-1 items-center justify-center py-20'>
          <BeatLoader color='#ff0000' loading={true} size={15} />
        </main>
      ) : null}
      {!shouldShowPrimaryLoader ? (
        <div className='relative'>
          <ListingsSection
            properties={{ items: displayedProperties } as CursorResult<TPropertyCard>}
            title={`Search Results ${titleCount ? `(${titleCount})` : ''}`}
            emptyText={
              isHydrationError
                ? 'Property cards failed to load. Please refresh and try again.'
                : isResolvingResults
                  ? undefined
                  : 'There are currently no results to view.'
            }
            pageSize={pageSize}
            hasMore={Boolean(hasNextPage)}
            loadingMore={isFetchingNextPage}
            onLoadMore={handleLoadMore}
          />
          {shouldShowOverlayLoader ? (
            <div className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center'>
              <BeatLoader color='#ff0000' loading={true} size={15} />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default ListingsResults;
