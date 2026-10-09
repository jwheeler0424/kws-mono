import type { PropertySearchMarker } from '@kws/schema';
import type { TListingsSearch } from '@kws/types';
import type { CursorResult, TMapBounds } from '@kws/types';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ClientOnly } from '@tanstack/react-router';
import React from 'react';
import { BeatLoader } from 'react-spinners';

import {
  getListingsMapMarkersForViewportServerFn,
  getListingsMapMarkersPaginatedServerFn,
} from '@/features/mls/functions/listings';
import { listingsForSearchAndFilterOptions } from '@/features/mls/options/listings';

import { MapView } from './map';

const MAP_MARKER_PAGE_SIZE = 3_000;

export function ListingsMap({ search }: { search: Partial<TListingsSearch> }) {
  const searchQuery = useQuery(listingsForSearchAndFilterOptions(search));
  const sessionId = searchQuery.data?.sessionId ?? '';
  const [viewportBounds, setViewportBounds] = React.useState<TMapBounds | null>(null);

  const handleViewportBoundsChange = React.useCallback((nextBounds: TMapBounds) => {
    setViewportBounds((current) => {
      if (
        current &&
        current.northEast.lat === nextBounds.northEast.lat &&
        current.northEast.lng === nextBounds.northEast.lng &&
        current.southWest.lat === nextBounds.southWest.lat &&
        current.southWest.lng === nextBounds.southWest.lng
      ) {
        return current;
      }

      return nextBounds;
    });
  }, []);

  const viewportQuery = useQuery({
    queryKey: ['listings', 'map-viewport-markers', sessionId, viewportBounds],
    queryFn: ({ signal }) =>
      getListingsMapMarkersForViewportServerFn({
        signal,
        data: { sessionId, bounds: viewportBounds! },
      }),
    enabled: Boolean(sessionId && viewportBounds),
    staleTime: 15_000,
    retry: 1,
  });

  const streamedMarkersQuery = useInfiniteQuery({
    queryKey: ['listings', 'map-marker-pages', sessionId],
    queryFn: ({ signal, pageParam }) =>
      getListingsMapMarkersPaginatedServerFn({
        signal,
        data: {
          sessionId,
          limit: MAP_MARKER_PAGE_SIZE,
          cursor: pageParam,
        },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: CursorResult<PropertySearchMarker>) =>
      lastPage.hasMore ? lastPage.nextCursor : null,
    enabled: Boolean(sessionId) && viewportQuery.isSuccess,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  React.useEffect(() => {
    if (
      !viewportQuery.isSuccess ||
      !streamedMarkersQuery.hasNextPage ||
      streamedMarkersQuery.isFetchingNextPage
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      void streamedMarkersQuery.fetchNextPage();
    }, 200);

    return () => clearTimeout(timeout);
  }, [
    streamedMarkersQuery.fetchNextPage,
    streamedMarkersQuery.hasNextPage,
    streamedMarkersQuery.isFetchingNextPage,
    viewportQuery.isSuccess,
  ]);

  const markers = React.useMemo(() => {
    const byId = new Map<string, PropertySearchMarker>();
    for (const marker of viewportQuery.data ?? []) {
      byId.set(String(marker.id), marker);
    }
    for (const page of streamedMarkersQuery.data?.pages ?? []) {
      for (const marker of page.items) {
        if (!byId.has(String(marker.id))) byId.set(String(marker.id), marker);
      }
    }
    return [...byId.values()];
  }, [streamedMarkersQuery.data?.pages, viewportQuery.data]);

  const markersLoading =
    searchQuery.isPending ||
    searchQuery.isFetching ||
    !viewportBounds ||
    viewportQuery.isPending ||
    viewportQuery.isFetching;

  return (
    <div className='relative h-[60vh] w-full overflow-hidden portrait:h-[60vh] landscape:h-[60vh] landscape:lg:h-[calc(80vh-4rem)]'>
      <ClientOnly
        fallback={
          <main className='flex h-full w-full flex-1 items-center justify-center py-20'>
            <BeatLoader color='#171717' loading={true} size={15} />
          </main>
        }>
        <MapView
          properties={markers}
          markersLoading={markersLoading}
          onViewportBoundsChange={handleViewportBoundsChange}
        />
      </ClientOnly>
    </div>
  );
}

export default ListingsMap;
