'use client';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

import { ensureLeafletRegistered, registerLeafletMap } from '@/lib/tools/leaflet';
import { createVectorBasemapLayer } from '@/lib/tools/vector-basemap';

export const ZOOM_BREAKPOINT = 14;

ensureLeafletRegistered();

export function PropertyMap({
  propertyPosition,
  setMapLoading,
}: {
  propertyPosition: LatLngTuple;
  setMapLoading: (loading: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const markerIcon = new L.Icon({
      iconUrl:
        'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDgyMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgICAgc3R5bGU9ImZpbGwtcnVsZTogZXZlbm9kZDsgY2xpcC1ydWxlOiBldmVub2RkOyBzdHJva2UtbGluZWNhcDogcm91bmQ7Ij4KICAgIDxkZWZzPgogICAgICAgIDxsaW5lYXJHcmFkaWVudCB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMi4zMDAyNWUtMTUsLTM3LjU2NiwzNy41NjYsMi4zMDAyNWUtMTUsNDE2LjQ1NSw1NDAuOTk5KSIgaWQ9Im1hcC1tYXJrZXItMzgtZiI+CiAgICAgICAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0icmdiKDIzLCAyMywgMjMpIi8+CiAgICAgICAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0icmdiKDY0LCA2NCwgNjQpIi8+CiAgICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgICAgICA8bGluZWFyR3JhZGllbnQgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjAiCiAgICAgICAgICAgICAgICAgICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICAgICAgICAgICAgICAgICAgICBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEuMTY2NjZlLTE1LC0xOS4wNTMsMTkuMDUzLDEuMTY2NjZlLTE1LDQxNC40ODIsNTIyLjQ4NikiCiAgICAgICAgICAgICAgICAgICAgICAgIGlkPSJtYXAtbWFya2VyLTM4LXMiPgogICAgICAgICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9InJnYigxMCwgMTAsIDEwKSIvPgogICAgICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9InJnYigxMTUsIDExNSwgMTE1KSIvPgogICAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgxOS41NDE3LDAsMCwxOS41NDE3LC03ODg5LjEsLTk4MDcuNDQpIj4KICAgICAgICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNNDIxLjIsNTE1LjVjMCwyLjYtMi4xLDQuNy00LjcsNC43Yy0yLjYsMC00LjctMi4xLTQuNy00LjdjMC0yLjYsMi4xLTQuNyw0LjctNC43IEM0MTkuMSw1MTAuOCw0MjEuMiw1MTIuOSw0MjEuMiw1MTUuNXoiLz4KICAgICAgICA8cGF0aCBkPSJNNDE2LjU0NCw1MDMuNjEyQzQwOS45NzEsNTAzLjYxMiA0MDQuNSw1MDkuMzAzIDQwNC41LDUxNS40NzhDNDA0LjUsNTE4LjI1NiA0MDYuMDY0LDUyMS43ODYgNDA3LjE5NCw1MjQuMjI0TDQxNi41LDU0Mi4wOTZMNDI1Ljc2Miw1MjQuMjI0QzQyNi44OTIsNTIxLjc4NiA0MjguNSw1MTguNDMzIDQyOC41LDUxNS40NzhDNDI4LjUsNTA5LjMwMyA0MjMuMTE3LDUwMy42MTIgNDE2LjU0NCw1MDMuNjEyWk00MTYuNTQ0LDUxMC43NjdDNDE5LjEyOCw1MTAuNzg0IDQyMS4yMjMsNTEyLjg4OSA0MjEuMjIzLDUxNS40NzdDNDIxLjIyMyw1MTguMDY1IDQxOS4xMjgsNTIwLjE0IDQxNi41NDQsNTIwLjE1NkM0MTMuOTYsNTIwLjEzOSA0MTEuODY1LDUxOC4wNjYgNDExLjg2NSw1MTUuNDc3QzQxMS44NjUsNTEyLjg4OSA0MTMuOTYsNTEwLjc4NCA0MTYuNTQ0LDUxMC43NjdaIiBzdHJva2Utd2lkdGg9IjEuMXB4IiBmaWxsPSJ1cmwoI21hcC1tYXJrZXItMzgtZikiIHN0cm9rZT0idXJsKCNtYXAtbWFya2VyLTM4LXMpIi8+CiAgICA8L2c+Cjwvc3ZnPgo=',
      iconSize: [20, 32.8], //[50,82]
      iconAnchor: [10, 32.8],
      popupAnchor: [0, 0],
    });

    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: propertyPosition,
      zoom: 12,
      scrollWheelZoom: false,
    }).addLayer(createVectorBasemapLayer());

    const unregisterMap = registerLeafletMap(map);

    const marker = L.marker(propertyPosition, {
      icon: markerIcon,
    });

    marker.addTo(map);
    mapRef.current = map;
    markerRef.current = marker;

    map.whenReady(() => {
      setMapLoading(false);
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;

      unregisterMap();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [propertyPosition, setMapLoading]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (!map || !marker) {
      return;
    }

    marker.setLatLng(propertyPosition);
    map.setView(propertyPosition, map.getZoom(), { animate: false });
  }, [propertyPosition]);

  return <div ref={containerRef} className='z-0 h-full w-full' />;
}

export default PropertyMap;
