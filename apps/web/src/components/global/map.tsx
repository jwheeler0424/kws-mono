import type { PropertyMapMarker } from '@kws/types';

import { useQueryClient } from '@tanstack/react-query';
import 'leaflet-edgebuffer';
import 'leaflet/dist/leaflet.css';
import L, { DivIcon, type LeafletEvent } from 'leaflet';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

import { DEFAULT_POSITION } from '@/config/constants/properties';
import { abbreviateNumber } from '@/lib/utils';
import { markerCardByListingKeyOptions } from '@/packages/mls/search.options';
import { useMapActions, useMapStore } from '@/stores/map.store';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';

import Loader from './map-loader';
import MapPopupCard from './map-popup-card';

export const ZOOM_BREAKPOINT = 14;

type MapProps = {
  properties: PropertyMapMarker[];
  markersLoading?: boolean;
  onInitialMarkersRendered?: () => void;
};

export function MapView({
  properties,
  markersLoading = false,
  onInitialMarkersRendered,
}: MapProps) {
  const queryClient = useQueryClient();
  const [mapLoading, setMapLoading] = React.useState(true);
  const [mapReady, setMapReady] = React.useState(false);
  const [openPopup, setOpenPopup] = useState<{ listingKey: string; container: HTMLElement } | null>(
    null,
  );
  const initialMarkersRenderedRef = useRef(false);
  const mapTimestamp = useMapStore((state) => state.timestamp);
  const positionUpdated = useMapStore((state) => state.positionUpdated);
  const mapPosition = useMapStore((state) => state.mapPosition);
  const userPosition = useMapStore((state) => state.userPosition);
  const zoom = useMapStore((state) => state.zoom);
  const { setPositionUpdated, setBounds, setMapPosition, setZoom } = useMapActions();

  const initialCenter = useMemo<[number, number]>(() => {
    const timestamp = Date.now() - mapTimestamp;
    const millisecondsInOneDay = 24 * 60 * 60 * 1000;

    if (timestamp < millisecondsInOneDay && mapPosition.lat && mapPosition.lng) {
      return [mapPosition.lat, mapPosition.lng];
    }

    return [DEFAULT_POSITION.lat, DEFAULT_POSITION.lng];
  }, [mapPosition.lat, mapPosition.lng, mapTimestamp]);

  const initialZoom = useMemo(() => {
    const timestamp = Date.now() - mapTimestamp;
    const millisecondsInOneDay = 24 * 60 * 60 * 1000;
    return timestamp < millisecondsInOneDay && zoom ? zoom : DEFAULT_POSITION.zoom;
  }, [mapTimestamp, zoom]);

  const prefetchMarkerCard = React.useCallback(
    (listingKey: string) => {
      if (!listingKey) {
        return;
      }

      const options = markerCardByListingKeyOptions(listingKey);
      const state = queryClient.getQueryState(options.queryKey);
      const staleTime = typeof options.staleTime === 'number' ? options.staleTime : 0;

      if (state?.fetchStatus === 'fetching') {
        return;
      }

      if (state?.dataUpdatedAt && staleTime > 0) {
        const isFresh = Date.now() - state.dataUpdatedAt < staleTime;
        if (isFresh) {
          return;
        }
      }

      void queryClient.ensureQueryData(options).catch(() => undefined);
    },
    [queryClient],
  );

  const mountPopupContent = React.useCallback((e: LeafletEvent, property: PropertyMapMarker) => {
    const marker = e.target as L.Marker;
    const container = document.createElement('div');
    container.className = 'w-72';
    marker.setPopupContent(container);
    setOpenPopup({ listingKey: property.listingKey, container });
  }, []);

  function clusterMarkerFactory() {
    return new DivIcon({
      className: 'h-auto w-auto rounded-full',
      html: `<div class="bg-polaris-primary flex shadow-md items-center justify-center h-3.5 min-w-3.5 w-fit px-1 font-rounded rounded-full text-center font-medium text-white ring-2 ring-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-icon lucide-ellipsis"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></div>`,
    });
  }

  const markerIcon = (listPrice: string, zoom: number) =>
    L.divIcon({
      className: 'h-auto w-auto rounded-full',
      html: `<div class="bg-polaris-primary flex text-2xs leading-0 shadow-md items-center justify-center h-3.5 min-w-3.5 w-fit rounded-full text-center ${
        zoom >= ZOOM_BREAKPOINT ? 'px-2' : 'px-0'
      } font-medium text-white ring-2 ring-white">${
        zoom >= ZOOM_BREAKPOINT ? abbreviateNumber(Number(listPrice), 2, { padding: false }) : ''
      }</div>`,
    });

  useEffect(() => {
    if (!mapReady) {
      setMapLoading(true);
    }
  }, [mapReady]);

  useEffect(() => {
    if (markersLoading) {
      initialMarkersRenderedRef.current = false;
    }
  }, [markersLoading]);

  useEffect(() => {
    if (mapReady && !markersLoading && !initialMarkersRenderedRef.current) {
      initialMarkersRenderedRef.current = true;
      onInitialMarkersRendered?.();
    }
  }, [mapReady, markersLoading, onInitialMarkersRendered, properties.length]);

  function MapEvents() {
    const map = useMap();
    const initializedRef = useRef(false);

    const handleMapChange = (targetMap: L.Map) => {
      const currentZoom = targetMap.getZoom();
      const mapBounds = targetMap.getBounds();
      const { lat, lng } = targetMap.getCenter();
      const bounds = {
        northEast: {
          lat: mapBounds.getNorthEast().lat,
          lng: mapBounds.getNorthEast().lng,
        },
        southWest: {
          lat: mapBounds.getSouthWest().lat,
          lng: mapBounds.getSouthWest().lng,
        },
      };

      setBounds(bounds);
      setZoom(currentZoom);
      setMapPosition({ lat, lng });
    };

    useMapEvents({
      movestart: () => {
        setMapLoading(true);
      },
      moveend: (e: LeafletEvent) => {
        handleMapChange(e.target as L.Map);
        setMapLoading(false);
      },
      zoomstart: () => {
        setMapLoading(true);
      },
      zoomend: (e: LeafletEvent) => {
        handleMapChange(e.target as L.Map);
        setMapLoading(false);
      },
    });

    useEffect(() => {
      if (initializedRef.current) {
        return;
      }
      initializedRef.current = true;

      const timestamp = Date.now() - mapTimestamp;
      const millisecondsInOneDay = 24 * 60 * 60 * 1000;

      if (!positionUpdated && userPosition) {
        map.flyTo([userPosition.lat, userPosition.lng], zoom);
        setPositionUpdated(true);
      } else if (timestamp < millisecondsInOneDay) {
        map.flyTo([mapPosition.lat, mapPosition.lng], zoom);
        setPositionUpdated(true);
      }

      setMapLoading(false);
      setMapReady(true);
      handleMapChange(map);
      // We only want to apply initial camera restoration once after the map mounts.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);

    return null;
  }

  return (
    <>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        maxZoom={18}
        scrollWheelZoom={false}
        className='absolute inset-0 z-0 h-full w-full'>
        <TileLayer
          url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          detectRetina
          edgeBufferTiles={2}
        />

        <MapEvents />

        <MarkerClusterGroup
          animate={false}
          chunkedLoading={false}
          maxClusterRadius={(currentZoom: number) => {
            return currentZoom < ZOOM_BREAKPOINT ? 36 : 16;
          }}
          showCoverageOnHover={false}
          removeOutsideVisibleBounds
          spiderfyOnMaxZoom
          iconCreateFunction={clusterMarkerFactory}>
          {properties.map((property) => (
            <Marker
              key={property.listingKey}
              position={[Number(property.latitude), Number(property.longitude)]}
              icon={markerIcon(property.listPrice ?? '0', zoom)}
              eventHandlers={{
                mouseover: () => {
                  prefetchMarkerCard(property.listingKey);
                },
                popupopen: (e: LeafletEvent) => {
                  mountPopupContent(e, property);
                },
                popupclose: () => {
                  setOpenPopup(null);
                },
              }}>
              <Popup autoPan keepInView closeButton={false} className='w-72'>
                <p>Loading property details...</p>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {mapLoading || markersLoading || !mapReady ? <Loader /> : null}
      {openPopup
        ? createPortal(<MapPopupCard listingKey={openPopup.listingKey} />, openPopup.container)
        : null}
    </>
  );
}

export default MapView;
