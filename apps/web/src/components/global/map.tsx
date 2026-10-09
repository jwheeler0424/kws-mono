import type { PropertySearchMarker } from '@kws/schema';
import type { TMapBounds } from '@kws/types';

import { DEFAULT_POSITION } from '@kws/config/constants/properties';
import L, { DivIcon, type LeafletEvent, type PopupEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import Supercluster from 'supercluster';

import { ensureLeafletRegistered, registerLeafletMap } from '@/lib/tools/leaflet';
import { abbreviateNumber } from '@/lib/utils';
import { useMapActions, useMapStore } from '@/stores/map.store';

import Loader from './map-loader';
import PropertyCardSkeleton from './property-card-skeleton';
import { VectorBasemapLayer } from './vector-basemap-layer';

ensureLeafletRegistered();

const ZOOM_BREAKPOINT = 14;
const CLUSTER_VIEWPORT_BUFFER_RATIO = 0.3;

const POPUP_SKELETON_NODE = <PropertyCardSkeleton className='w-full max-w-none' />;

type OpenPopupState = {
  listingKey: string;
  lat: number;
  lng: number;
};

type MarkerLayerProps = {
  index: Supercluster<ClusterPointProperties, ClusterProperties>;
  showPriceLabels: boolean;
  markerIconFactory: (
    listPrice: PropertySearchMarker['listPrice'],
    showPriceLabels: boolean,
  ) => L.DivIcon;
  clusterIconFactory: (count: number) => L.DivIcon;
  onMarkerClick: (property: PropertySearchMarker) => void;
};

type ClusterPointProperties = {
  property: PropertySearchMarker;
};

type ClusterProperties = {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: number | string;
};

type ClusterPointFeature = {
  type: 'Feature';
  properties: ClusterPointProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

type ClusterFeature = {
  type: 'Feature';
  properties: ClusterProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

const isClusterFeature = (
  feature: ClusterPointFeature | ClusterFeature,
): feature is ClusterFeature => {
  return (feature.properties as Partial<ClusterProperties>).cluster === true;
};

function setMarkerAccessibleName(event: LeafletEvent, label: string) {
  const element = (event.target as L.Marker).getElement();
  element?.setAttribute('aria-label', label);
  element?.setAttribute('title', label);
}

const MarkerLayer = React.memo(function MarkerLayer({
  index,
  showPriceLabels,
  markerIconFactory,
  clusterIconFactory,
  onMarkerClick,
}: MarkerLayerProps) {
  const map = useMap();

  const getBufferedBounds = React.useCallback(() => {
    return map.getBounds().pad(CLUSTER_VIEWPORT_BUFFER_RATIO);
  }, [map]);

  const [viewport, setViewport] = useState<{
    zoom: number;
    bounds: [number, number, number, number];
  }>(() => {
    const bounds = getBufferedBounds();
    return {
      zoom: Math.round(map.getZoom()),
      bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
    };
  });

  const syncViewport = React.useCallback(() => {
    const bounds = getBufferedBounds();
    setViewport({
      zoom: Math.round(map.getZoom()),
      bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
    });
  }, [getBufferedBounds, map]);

  useMapEvents({
    moveend: syncViewport,
    zoomend: syncViewport,
  });

  const clusters = useMemo(
    () =>
      index.getClusters(viewport.bounds, viewport.zoom) as Array<
        ClusterPointFeature | ClusterFeature
      >,
    [index, viewport.bounds, viewport.zoom],
  );

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;

        if (isClusterFeature(feature)) {
          const clusterId = feature.properties.cluster_id;
          const pointCount = feature.properties.point_count;

          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={clusterIconFactory(pointCount)}
              title={`${pointCount} ${pointCount === 1 ? 'property' : 'properties'}; activate to zoom in`}
              eventHandlers={{
                add: (event) =>
                  setMarkerAccessibleName(
                    event,
                    `${pointCount} ${pointCount === 1 ? 'property' : 'properties'}; activate to zoom in`,
                  ),
                click: () => {
                  const nextZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
                  map.setView([lat, lng], nextZoom, { animate: true });
                },
              }}
            />
          );
        }

        const property = feature.properties.property;
        return (
          <Marker
            key={property.id}
            position={[Number(property.latitude), Number(property.longitude)]}
            icon={markerIconFactory(property.listPrice, showPriceLabels)}
            title={getPropertyMarkerAccessibleName(property)}
            eventHandlers={{
              add: (event) =>
                setMarkerAccessibleName(event, getPropertyMarkerAccessibleName(property)),
              click: () => {
                onMarkerClick(property);
              },
            }}
          />
        );
      })}
    </>
  );
});

function getPropertyMarkerAccessibleName(property: PropertySearchMarker): string {
  const listingId = property.listingId?.replace(/^\D+/, '') || property.listingKey;
  const price = Number(property.listPrice);
  const priceLabel =
    Number.isFinite(price) && price > 0 ? `, listed for $${price.toLocaleString()}` : '';
  return `Property listing ${listingId}${priceLabel}; activate to view details`;
}

type SharedPopupHostProps = {
  openPopup: OpenPopupState | null;
  onClose: () => void;
};

function SharedPopupHost({ openPopup, onClose }: SharedPopupHostProps) {
  const map = useMap();
  const popupRef = useRef<L.Popup | null>(null);
  const [container] = useState(() => {
    const node = document.createElement('div');
    node.className = 'w-72';
    return node;
  });
  const [PopupCardComponent, setPopupCardComponent] = useState<React.ComponentType<{
    listingKey: string;
  }> | null>(null);

  useEffect(() => {
    if (!openPopup || PopupCardComponent) {
      return;
    }

    let active = true;

    void import('./map-popup-card').then((mod) => {
      if (!active) {
        return;
      }
      setPopupCardComponent(() => mod.default);
    });

    return () => {
      active = false;
    };
  }, [openPopup, PopupCardComponent]);

  useEffect(() => {
    popupRef.current = L.popup({
      autoPan: true,
      keepInView: true,
      closeButton: false,
      className: 'w-72',
    });

    const handlePopupClose = (event: PopupEvent) => {
      if (event.popup === popupRef.current) {
        onClose();
      }
    };

    map.on('popupclose', handlePopupClose);

    return () => {
      map.off('popupclose', handlePopupClose);
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, [map, onClose]);

  useEffect(() => {
    if (!popupRef.current) {
      return;
    }

    if (!openPopup) {
      map.closePopup(popupRef.current);
      return;
    }

    popupRef.current.setLatLng([openPopup.lat, openPopup.lng]).setContent(container).openOn(map);
  }, [map, openPopup, container]);

  if (!openPopup) {
    return null;
  }

  return createPortal(
    PopupCardComponent ? (
      <PopupCardComponent listingKey={openPopup.listingKey} />
    ) : (
      POPUP_SKELETON_NODE
    ),
    container,
  );
}

type MapProps = {
  properties: PropertySearchMarker[];
  markersLoading?: boolean;
  onInitialMarkersRendered?: () => void;
  onViewportBoundsChange?: (bounds: TMapBounds) => void;
};

type MapEventsProps = {
  mapTimestamp: number;
  positionUpdated: boolean;
  mapPosition: { lat: number; lng: number };
  userPosition: { lat: number; lng: number } | null;
  zoom: number;
  setPositionUpdated: (positionUpdated: boolean) => void;
  setBounds: (bounds: {
    northEast: { lat: number; lng: number };
    southWest: { lat: number; lng: number };
  }) => void;
  setMapPosition: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setMapLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMapReady: React.Dispatch<React.SetStateAction<boolean>>;
  onViewportBoundsChange?: (bounds: TMapBounds) => void;
};

function MapEvents({
  mapTimestamp,
  positionUpdated,
  mapPosition,
  userPosition,
  zoom,
  setPositionUpdated,
  setBounds,
  setMapPosition,
  setZoom,
  setMapLoading,
  setMapReady,
  onViewportBoundsChange,
}: MapEventsProps) {
  const map = useMap();
  const initializedRef = useRef(false);

  const handleMapChange = React.useCallback(
    (targetMap: L.Map) => {
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
      onViewportBoundsChange?.(bounds);
      setZoom(currentZoom);
      setMapPosition({ lat, lng });
    },
    [onViewportBoundsChange, setBounds, setMapPosition, setZoom],
  );

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

function MapLifecycleTracker() {
  const map = useMap();

  useEffect(() => {
    return registerLeafletMap(map);
  }, [map]);

  return null;
}

export function MapView({
  properties,
  markersLoading = false,
  onInitialMarkersRendered,
  onViewportBoundsChange,
}: MapProps) {
  const [mapLoading, setMapLoading] = React.useState(true);
  const [mapReady, setMapReady] = React.useState(false);
  const markersReady = mapReady && !markersLoading;
  const [mountedAt] = useState(() => Date.now());
  const [openPopup, setOpenPopup] = useState<OpenPopupState | null>(null);
  const initialMarkersRenderedRef = useRef(false);
  const markerIconCacheRef = useRef(new Map<string, L.DivIcon>());
  const clusterIconCacheRef = useRef(new Map<number, L.DivIcon>());
  const mapTimestamp = useMapStore((state) => state.timestamp);
  const positionUpdated = useMapStore((state) => state.positionUpdated);
  const mapPosition = useMapStore((state) => state.mapPosition);
  const userPosition = useMapStore((state) => state.userPosition);
  const zoom = useMapStore((state) => state.zoom);
  const { setPositionUpdated, setBounds, setMapPosition, setZoom } = useMapActions();
  const displayedProperties = properties;

  const initialCenter = useMemo<[number, number]>(() => {
    const timestamp = mountedAt - mapTimestamp;
    const millisecondsInOneDay = 24 * 60 * 60 * 1000;

    if (timestamp < millisecondsInOneDay && mapPosition.lat && mapPosition.lng) {
      return [mapPosition.lat, mapPosition.lng];
    }

    return [DEFAULT_POSITION.lat, DEFAULT_POSITION.lng];
  }, [mapPosition.lat, mapPosition.lng, mapTimestamp, mountedAt]);

  const initialZoom = useMemo(() => {
    const timestamp = mountedAt - mapTimestamp;
    const millisecondsInOneDay = 24 * 60 * 60 * 1000;
    return timestamp < millisecondsInOneDay && zoom ? zoom : DEFAULT_POSITION.zoom;
  }, [mapTimestamp, zoom, mountedAt]);

  const handleMarkerClick = React.useCallback((property: PropertySearchMarker) => {
    if (!property.listingKey) {
      return;
    }

    const latitude = Number(property.latitude);
    const longitude = Number(property.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    setOpenPopup({
      listingKey: property.listingKey,
      lat: latitude,
      lng: longitude,
    });
  }, []);

  const handlePopupClose = React.useCallback(() => {
    setOpenPopup(null);
  }, []);

  const clusterMarkerFactory = React.useCallback((_count: number) => {
    const cached = clusterIconCacheRef.current.get(0);
    if (cached) {
      return cached;
    }

    const icon = new DivIcon({
      className: 'h-auto w-auto rounded-full',
      html: `<div class="bg-polaris-primary flex shadow-md items-center justify-center h-3.5 min-w-3.5 w-fit px-1 font-rounded rounded-full text-center font-medium text-white ring-2 ring-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-icon lucide-ellipsis"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></div>`,
    });

    clusterIconCacheRef.current.set(0, icon);
    return icon;
  }, []);

  const markerIcon = React.useCallback(
    (listPrice: PropertySearchMarker['listPrice'], showPriceLabels: boolean) => {
      const cacheKey = showPriceLabels
        ? `price-${abbreviateNumber(Number(listPrice ?? 0), 2, { padding: false })}`
        : 'dot';

      const cached = markerIconCacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      const label = showPriceLabels
        ? abbreviateNumber(Number(listPrice ?? 0), 2, { padding: false })
        : '';

      const icon = L.divIcon({
        className: 'h-auto w-auto rounded-full',
        html: `<div class="bg-polaris-primary flex text-2xs leading-0 shadow-md items-center justify-center h-3.5 min-w-3.5 w-fit rounded-full text-center ${
          showPriceLabels ? 'px-2' : 'px-0'
        } font-medium text-white ring-2 ring-white">${label}</div>`,
      });

      markerIconCacheRef.current.set(cacheKey, icon);

      return icon;
    },
    [],
  );

  const showPriceLabels = zoom >= ZOOM_BREAKPOINT;

  const clusterPoints = useMemo<Array<ClusterPointFeature>>(
    () =>
      displayedProperties.flatMap((property) => {
        const latitude = Number(property.latitude);
        const longitude = Number(property.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return [];
        }

        return [
          {
            type: 'Feature',
            properties: { property },
            geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
          },
        ];
      }),
    [displayedProperties],
  );

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<ClusterPointProperties, ClusterProperties>({
      radius: 60,
      maxZoom: 18,
      minZoom: 0,
    });
    index.load(clusterPoints);
    return index;
  }, [clusterPoints]);

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
  }, [mapReady, markersLoading, onInitialMarkersRendered, displayedProperties.length]);

  useEffect(() => {
    const markerIconCache = markerIconCacheRef.current;
    const clusterIconCache = clusterIconCacheRef.current;

    return () => {
      markerIconCache.clear();
      clusterIconCache.clear();
    };
  }, []);

  return (
    <>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        maxZoom={18}
        scrollWheelZoom={false}
        className='absolute inset-0 z-0 h-full w-full'>
        <VectorBasemapLayer />

        <MapEvents
          mapTimestamp={mapTimestamp}
          positionUpdated={positionUpdated}
          mapPosition={mapPosition}
          userPosition={userPosition}
          zoom={zoom}
          setPositionUpdated={setPositionUpdated}
          setBounds={setBounds}
          setMapPosition={setMapPosition}
          setZoom={setZoom}
          setMapLoading={setMapLoading}
          setMapReady={setMapReady}
          onViewportBoundsChange={onViewportBoundsChange}
        />

        <MapLifecycleTracker />

        <MarkerLayer
          index={clusterIndex}
          showPriceLabels={showPriceLabels}
          markerIconFactory={markerIcon}
          clusterIconFactory={clusterMarkerFactory}
          onMarkerClick={handleMarkerClick}
        />

        <SharedPopupHost openPopup={openPopup} onClose={handlePopupClose} />
      </MapContainer>

      {mapLoading || !mapReady || markersLoading || !markersReady ? <Loader /> : null}
    </>
  );
}

export default MapView;
