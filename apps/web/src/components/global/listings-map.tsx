import { useQuery } from '@tanstack/react-query';
import { ClientOnly } from '@tanstack/react-router';
import React from 'react';

import type { PropertyMapMarker } from '@/packages/mls/types';
import type { TListingsSearch } from '@/types/search';

import { searchListingsMapMarkersFromRouteOptions } from '@/packages/mls/search.options';

import Loader from './map-loader';

type MapViewComponent = React.ComponentType<{
  properties: PropertyMapMarker[];
  markersLoading?: boolean;
}>;

const MAP_TILE_HOSTS = [
  'https://a.basemaps.cartocdn.com',
  'https://b.basemaps.cartocdn.com',
  'https://c.basemaps.cartocdn.com',
  'https://d.basemaps.cartocdn.com',
] as const;

export function ListingsMap({ params }: { params: TListingsSearch }) {
  const [mapViewComponent, setMapViewComponent] = React.useState<MapViewComponent | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let isCancelled = false;

    void import('./map').then((mod) => {
      if (!isCancelled) {
        setMapViewComponent(() => mod.MapView);
      }
    });

    const links = MAP_TILE_HOSTS.flatMap((host) => {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = host;
      preconnect.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect);

      const dnsPrefetch = document.createElement('link');
      dnsPrefetch.rel = 'dns-prefetch';
      dnsPrefetch.href = host;
      document.head.appendChild(dnsPrefetch);

      return [preconnect, dnsPrefetch];
    });

    return () => {
      isCancelled = true;
      for (const link of links) {
        link.remove();
      }
    };
  }, []);

  const { data, isPending } = useQuery(searchListingsMapMarkersFromRouteOptions(params));

  const properties = data ?? [];

  return (
    <div className='relative h-[60vh] w-full overflow-hidden portrait:h-[60vh] landscape:h-[60vh] landscape:lg:h-[calc(80vh-4rem)]'>
      <div id='listings-map' className='absolute inset-0 z-0' />

      <ClientOnly fallback={<Loader />}>
        {mapViewComponent ? (
          React.createElement(mapViewComponent, {
            properties,
            markersLoading: isPending,
          })
        ) : (
          <Loader />
        )}
      </ClientOnly>
    </div>
  );
}
/**
 * className='relative h-[60vh] w-full portrait:h-[60vh] landscape:h-[60vh] landscape:lg:h-[calc(80vh-4rem)]'
 */

export default ListingsMap;
