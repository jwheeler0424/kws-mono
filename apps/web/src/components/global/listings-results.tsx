import type { CursorResult, TListingsSearch, TPropertyCard } from '@kws/types';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import {
  searchListingsCountFromRouteOptions,
  searchListingsPageFromRouteOptions,
  toSearchInput,
} from '@/packages/mls/search.options';
import { searchPropertyCardsPageServerFn } from '@/packages/mls/search.service';

import ListingsSection from './listings-section';
import Loader from './map-loader';

export function ListingsResults({ params }: { params: TListingsSearch }) {
  const { data: countData } = useQuery(searchListingsCountFromRouteOptions(params));

  const {
    data: firstPage,
    isPending,
    isFetching,
  } = useQuery({
    ...searchListingsPageFromRouteOptions(params),
    queryFn: ({ signal }) =>
      searchPropertyCardsPageServerFn({
        signal,
        data: toSearchInput(params, {
          limit: params.limit ?? 48,
        }),
      }),
  });

  const [pages, setPages] = React.useState<CursorResult<TPropertyCard>[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    if (!firstPage) {
      setPages([]);
      setNextCursor(null);
      return;
    }

    setPages([firstPage]);
    setNextCursor(firstPage.nextCursor);
  }, [firstPage]);

  const properties = React.useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const resultCount = countData ?? 0;
  const resultCountRef = React.useRef(resultCount);
  resultCountRef.current = resultCount;

  const handleLoadMore = React.useCallback(() => {
    if (!nextCursor || loadingMore || properties.length >= resultCountRef.current) {
      return false;
    }

    setLoadingMore(true);

    void searchPropertyCardsPageServerFn({
      data: toSearchInput(params, {
        cursor: nextCursor,
        limit: params.limit ?? 48,
      }),
    })
      .then((page) => {
        setPages((currentPages) => [...currentPages, page]);
        setNextCursor(page.nextCursor);
      })
      .finally(() => {
        setLoadingMore(false);
      });

    return true;
  }, [loadingMore, nextCursor, params, properties.length]);

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
