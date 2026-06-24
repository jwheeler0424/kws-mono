import { useQueryClient } from '@tanstack/react-query';
import L, { DivIcon, type LeafletEvent } from 'leaflet';
import 'leaflet-edgebuffer';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { PropertyMapMarker } from '@/packages/mls/types';

import { DEFAULT_POSITION } from '@/config/constants/properties';
import { abbreviateNumber } from '@/lib/utils';
import { markerCardByListingKeyOptions } from '@/packages/mls/search.options';
import { useMapActions, useMapStore } from '@/stores/map.store';
import 'react-leaflet-markercluster/styles';

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
  const [markersReady, setMarkersReady] = React.useState(false);
  const [openPopup, setOpenPopup] = useState<{ listingKey: string; container: HTMLElement } | null>(
    null,
  );
  const initialMarkersRenderedRef = useRef(false);
  const mapRef = useRef<L.Map>(null);
  const markersRef = useRef<L.MarkerClusterGroup>(null);
  const mapTimestamp = useMapStore((state) => state.timestamp);
  const positionUpdated = useMapStore((state) => state.positionUpdated);
  const mapPosition = useMapStore((state) => state.mapPosition);
  const userPosition = useMapStore((state) => state.userPosition);
  const zoom = useMapStore((state) => state.zoom);
  const { setPositionUpdated, setBounds, setMapPosition, setZoom } = useMapActions();

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

  const createPropertyMarker = React.useCallback(
    (property: PropertyMapMarker) => {
      const marker = L.marker([Number(property.latitude), Number(property.longitude)], {
        icon: markerIcon(property.listPrice ?? '0', zoom),
      });
      marker.bindPopup(`<p>Loading property details...</p>`, {
        autoPan: true,
        keepInView: true,
        closeButton: false,
        className: 'w-72',
      });
      marker.on('mouseover', () => {
        prefetchMarkerCard(property.listingKey);
      });
      marker.on('popupopen', (e: L.LeafletEvent) => {
        mountPopupContent(e, property);
      });
      marker.on('popupclose', () => {
        setOpenPopup(null);
      });

      return marker;
    },
    [mountPopupContent, prefetchMarkerCard, zoom],
  );

  const generatePropertyMarkers = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    setMarkersReady(false);

    const nextMarkers = L.markerClusterGroup({
      animate: false,
      chunkedLoading: false,
      maxClusterRadius: (zoom: number) => {
        return zoom < ZOOM_BREAKPOINT ? 36 : 16;
      },
      showCoverageOnHover: false,
      removeOutsideVisibleBounds: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: clusterMarkerFactory,
    });

    for (const property of properties) {
      nextMarkers.addLayer(createPropertyMarker(property));
    }

    const previousMarkers = markersRef.current;
    map.addLayer(nextMarkers);
    if (previousMarkers) {
      map.removeLayer(previousMarkers);
      previousMarkers.clearLayers();
    }

    markersRef.current = nextMarkers;
    setMarkersReady(true);
    if (!initialMarkersRenderedRef.current && !markersLoading) {
      initialMarkersRenderedRef.current = true;
      onInitialMarkersRendered?.();
    }
  }, [createPropertyMarker, markersLoading, onInitialMarkersRendered, properties]);

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
    const timestamp = Date.now() - mapTimestamp;
    const millisecondsInOneDay = 24 * 60 * 60 * 1000;
    if (!mapRef.current)
      mapRef.current = L.map('listings-map', {
        center:
          timestamp < millisecondsInOneDay && mapPosition.lat && mapPosition.lng
            ? [mapPosition.lat, mapPosition.lng]
            : [DEFAULT_POSITION.lat, DEFAULT_POSITION.lng],
        zoom: timestamp < millisecondsInOneDay && zoom ? zoom : DEFAULT_POSITION.zoom,
        maxZoom: 18,
        scrollWheelZoom: false,
      }).addLayer(
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          detectRetina: true,
          edgeBufferTiles: 2,
        }),
      );

    if (!markersRef.current)
      markersRef.current = L.markerClusterGroup({
        animate: false,
        chunkedLoading: false,
        maxClusterRadius: (zoom: number) => {
          return zoom < ZOOM_BREAKPOINT ? 36 : 16;
        },
        showCoverageOnHover: false,
        removeOutsideVisibleBounds: true,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: clusterMarkerFactory,
      });

    mapRef.current.addLayer(markersRef.current);
    setMapLoading(false);

    return () => {
      markersRef.current?.clearLayers();
      markersRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (markersLoading) {
      initialMarkersRenderedRef.current = false;
    }
  }, [markersLoading]);

  useEffect(() => {
    generatePropertyMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  useEffect(() => {
    const map = mapRef.current;

    const handleMapChange = (map: L.Map) => {
      const zoom = map.getZoom();
      const mapBounds = map.getBounds();
      const { lat, lng } = map.getCenter();
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
      setZoom(zoom);
      setMapPosition({ lat, lng });
    };

    const handleMoveStart = (_e: LeafletEvent) => {
      setMapLoading(true);
    };

    const handleMoveEnd = (e: LeafletEvent) => {
      handleMapChange(e.target as L.Map);
      setMapLoading(false);
    };

    const handleZoomStart = (_e: LeafletEvent) => {
      setMapLoading(true);
    };

    const handleZoomEnd = (e: LeafletEvent) => {
      const prevZoom = zoom;
      const mapTarget = e.target as L.Map;
      const currentZoom = mapTarget.getZoom();

      const crossZoomThreshold =
        (prevZoom >= ZOOM_BREAKPOINT && currentZoom < ZOOM_BREAKPOINT) ||
        (prevZoom < ZOOM_BREAKPOINT && currentZoom >= ZOOM_BREAKPOINT);
      if (crossZoomThreshold) {
        markersRef.current?.clearLayers();
        generatePropertyMarkers();
      }

      handleMapChange(mapTarget);

      setMapLoading(false);
    };

    map?.on('movestart', handleMoveStart);
    map?.on('moveend', handleMoveEnd);

    map?.on('zoomstart', handleZoomStart);
    map?.on('zoomend', handleZoomEnd);

    map?.whenReady((e: { target: L.Map }) => {
      const timestamp = Date.now() - mapTimestamp;
      const millisecondsInOneDay = 24 * 60 * 60 * 1000;

      if (!positionUpdated && userPosition) {
        e.target.flyTo([userPosition.lat, userPosition.lng], zoom);
        setPositionUpdated(true);
      } else if (Date.now() - timestamp < millisecondsInOneDay) {
        // Timestamp is not older than 24 hours
        e.target.flyTo([mapPosition.lat, mapPosition.lng], zoom);
        setPositionUpdated(true);
      }
      setMapLoading(false);
    });

    return () => {
      map?.off('movestart', handleMoveStart);
      map?.off('moveend', handleMoveEnd);
      map?.off('zoomstart', handleZoomStart);
      map?.off('zoomend', handleZoomEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatePropertyMarkers, mapPosition, mapTimestamp, positionUpdated, userPosition]);

  return (
    <>
      {mapLoading || markersLoading || !markersReady ? <Loader /> : null}
      {openPopup
        ? createPortal(<MapPopupCard listingKey={openPopup.listingKey} />, openPopup.container)
        : null}
    </>
  );
}

export default MapView;
