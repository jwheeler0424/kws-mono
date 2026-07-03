import type { TListingMarker, TListingsSearch } from '@kws/types';

import { ClientOnly } from '@tanstack/react-router';
import React from 'react';

import Loader from './map-loader';

type MapViewComponent = React.ComponentType<any>;

const MAP_TILE_HOSTS = [
  'https://a.basemaps.cartocdn.com',
  'https://b.basemaps.cartocdn.com',
  'https://c.basemaps.cartocdn.com',
  'https://d.basemaps.cartocdn.com',
] as const;

export function ListingsMap({
  params: _params,
  markers,
  markersLoading = false,
}: {
  params: TListingsSearch;
  markers: TListingMarker[];
  markersLoading?: boolean;
}) {
  const [mapViewComponent, setMapViewComponent] = React.useState<MapViewComponent | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let isCancelled = false;

    void import('./map').then((mod) => {
      if (!isCancelled) {
        setMapViewComponent(() => mod.MapView as MapViewComponent);
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

  const properties = markers;
  const DynamicMapView = mapViewComponent as React.ComponentType<any> | null;

  return (
    <div className='relative h-[60vh] w-full overflow-hidden portrait:h-[60vh] landscape:h-[60vh] landscape:lg:h-[calc(80vh-4rem)]'>
      <ClientOnly fallback={<Loader />}>
        {DynamicMapView ? (
          <DynamicMapView properties={properties as any} markersLoading={markersLoading} />
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
