import type { CursorResult, TListingsSearch, TPropertyCard } from '@kws/types';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import {
  hydrateListingCardsByKeysOptions,
  searchListingsPageFromRouteOptions,
} from '@/features/mls/options/search';

import ListingsSection from './listings-section';
import Loader from './map-loader';

export function ListingsResults({
  params,
  resultCount,
}: {
  params: Partial<TListingsSearch>;
  resultCount: number;
}) {
  const queryClient = useQueryClient();
  const pageSize = params.limit ?? 48;

  const {
    data: firstPageMarkers,
    isPending,
    isFetching,
  } = useQuery(searchListingsPageFromRouteOptions(params, { limit: pageSize }));

  const firstPageKeys = React.useMemo(
    () => firstPageMarkers?.items.map((item) => item.listingKey) ?? [],
    [firstPageMarkers],
  );

  const { data: firstPageCards } = useQuery(
    hydrateListingCardsByKeysOptions({ listingKeys: firstPageKeys, maxBatchSize: pageSize }),
  );

  const [pages, setPages] = React.useState<CursorResult<TPropertyCard>[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    if (!firstPageMarkers || !firstPageCards) {
      setPages([]);
      setNextCursor(null);
      return;
    }

    setPages([
      {
        items: firstPageCards,
        nextCursor: firstPageMarkers.nextCursor,
        hasMore: firstPageMarkers.hasMore,
      },
    ]);
    setNextCursor(firstPageMarkers.nextCursor);
  }, [firstPageCards, firstPageMarkers]);

  const properties = React.useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const resultCountRef = React.useRef(resultCount);
  resultCountRef.current = resultCount;

  const handleLoadMore = React.useCallback(() => {
    if (!nextCursor || loadingMore || properties.length >= resultCountRef.current) {
      return false;
    }

    setLoadingMore(true);

    void (async () => {
      const markerPage = await queryClient.ensureQueryData(
        searchListingsPageFromRouteOptions(params, {
          cursor: nextCursor,
          limit: pageSize,
        }),
      );

      const listingKeys = markerPage.items.map((item) => item.listingKey);
      const cards = listingKeys.length
        ? await queryClient.ensureQueryData(
            hydrateListingCardsByKeysOptions({ listingKeys, maxBatchSize: pageSize }),
          )
        : [];

      return {
        items: cards,
        nextCursor: markerPage.nextCursor,
        hasMore: markerPage.hasMore,
      } as CursorResult<TPropertyCard>;
    })()
      .then((page) => {
        setPages((currentPages) => [...currentPages, page]);
        setNextCursor(page.nextCursor);
      })
      .finally(() => {
        setLoadingMore(false);
      });

    return true;
  }, [loadingMore, nextCursor, pageSize, params, properties.length, queryClient]);

  return (
    <>
      {isPending ? <Loader /> : null}
      <ListingsSection
        properties={{ items: properties } as CursorResult<TPropertyCard>}
        title={`Search Results ${resultCount ? `(${resultCount})` : ''}`}
        emptyText={isPending || isFetching ? '' : 'There are currently no results to view.'}
        pageSize={params.limit ?? 48}
        hasMore={Boolean(nextCursor)}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
      />
    </>
  );
}

export default ListingsResults;
