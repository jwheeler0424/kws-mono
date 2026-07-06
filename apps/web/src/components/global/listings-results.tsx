import type { CursorResult, TListingsSearch, TPropertyCard } from '@kws/types';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { searchListingsCardsPageFromRouteOptions } from '@/features/mls/options/search';

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
  const pageSize = params.limit ?? 24;

  const {
    data: firstPageCards,
    isPending,
    isFetching,
  } = useQuery(searchListingsCardsPageFromRouteOptions(params, { limit: pageSize }));

  const [pages, setPages] = React.useState<CursorResult<TPropertyCard>[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    if (!firstPageCards) {
      setPages([]);
      setNextCursor(null);
      return;
    }

    setPages([
      {
        items: firstPageCards.items,
        nextCursor: firstPageCards.nextCursor,
        hasMore: firstPageCards.hasMore,
      },
    ]);
    setNextCursor(firstPageCards.nextCursor);
  }, [firstPageCards]);

  const properties = React.useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const resultCountRef = React.useRef(resultCount);
  resultCountRef.current = resultCount;

  const handleLoadMore = React.useCallback(() => {
    if (!nextCursor || loadingMore || properties.length >= resultCountRef.current) {
      return false;
    }

    setLoadingMore(true);

    void (async () => {
      const cardsPage = await queryClient.ensureQueryData(
        searchListingsCardsPageFromRouteOptions(params, {
          cursor: nextCursor,
          limit: pageSize,
        }),
      );

      return {
        items: cardsPage.items,
        nextCursor: cardsPage.nextCursor,
        hasMore: cardsPage.hasMore,
      } as CursorResult<TPropertyCard>;
    })()
      .then((page) => {
        setPages((currentPages) => [...currentPages, page]);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        // Keep current page state; allow users to retry load-more.
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
        pageSize={params.limit ?? 24}
        hasMore={Boolean(nextCursor)}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
      />
    </>
  );
}

export default ListingsResults;
