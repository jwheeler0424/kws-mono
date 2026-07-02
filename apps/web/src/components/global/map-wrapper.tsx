'use client';

import type { LatLngTuple } from 'leaflet';

import { ClientOnly } from '@tanstack/react-router';
import React from 'react';

import Loader from './map-loader';

// Dynamically import the PropertyMap component with SSR disabled
const PropertyMap = React.lazy(() => import('./property-map'));

export default function PropertyMapWrapper({
  propertyPosition,
}: {
  propertyPosition: LatLngTuple;
}) {
  const [mapLoading, setMapLoading] = React.useState(true);
  return (
    <>
      {mapLoading && <Loader />}
      <ClientOnly fallback={<Loader />}>
        <PropertyMap propertyPosition={propertyPosition} setMapLoading={setMapLoading} />
      </ClientOnly>
    </>
  );
}
