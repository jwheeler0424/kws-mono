'use client';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

import { ensureLeafletRegistered, registerLeafletMap } from '@/lib/tools/leaflet';

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
        'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDgyMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgICAgc3R5bGU9ImZpbGwtcnVsZTogZXZlbm9kZDsgY2xpcC1ydWxlOiBldmVub2RkOyBzdHJva2UtbGluZWNhcDogcm91bmQ7Ij4KICAgIDxkZWZzPgogICAgICAgIDxsaW5lYXJHcmFkaWVudCB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMi4zMDAyNWUtMTUsLTM3LjU2NiwzNy41NjYsMi4zMDAyNWUtMTUsNDE2LjQ1NSw1NDAuOTk5KSIgaWQ9Im1hcC1tYXJrZXItMzgtZiI+CiAgICAgICAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0icmdiKDIwNCwgMTUsIDIyKSIvPgogICAgICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9InJnYigyMzgsIDMzLCAzOSkiLz4KICAgICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgICAgIDxsaW5lYXJHcmFkaWVudCB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMCIKICAgICAgICAgICAgICAgICAgICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICAgICAgICAgICAgICAgICAgIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMS4xNjY2NmUtMTUsLTE5LjA1MywxOS4wNTMsMS4xNjY2NmUtMTUsNDE0LjQ4Miw1MjIuNDg2KSIKICAgICAgICAgICAgICAgICAgICAgICAgaWQ9Im1hcC1tYXJrZXItMzgtcyI+CiAgICAgICAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0icmdiKDE1NywgMTIsIDE3KSIvPgogICAgICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9InJnYigyNDIsIDgwLCA4NSkiLz4KICAgICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMTkuNTQxNywwLDAsMTkuNTQxNywtNzg4OS4xLC05ODA3LjQ0KSI+CiAgICAgICAgPHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTQyMS4yLDUxNS41YzAsMi42LTIuMSw0LjctNC43LDQuN2MtMi42LDAtNC43LTIuMS00LjctNC43YzAtMi42LDIuMS00LjcsNC43LTQuNyBDNDE5LjEsNTEwLjgsNDIxLjIsNTEyLjksNDIxLjIsNTE1LjV6Ii8+CiAgICAgICAgPHBhdGggZD0iTTQxNi41NDQsNTAzLjYxMkM0MDkuOTcxLDUwMy42MTIgNDA0LjUsNTA5LjMwMyA0MDQuNSw1MTUuNDc4QzQwNC41LDUxOC4yNTYgNDA2LjA2NCw1MjEuNzg2IDQwNy4xOTQsNTI0LjIyNEw0MTYuNSw1NDIuMDk2TDQyNS43NjIsNTI0LjIyNEM0MjYuODkyLDUyMS43ODYgNDI4LjUsNTE4LjQzMyA0MjguNSw1MTUuNDc4QzQyOC41LDUwOS4zMDMgNDIzLjExNyw1MDMuNjEyIDQxNi41NDQsNTAzLjYxMlpNNDE2LjU0NCw1MTAuNzY3QzQxOS4xMjgsNTEwLjc4NCA0MjEuMjIzLDUxMi44ODkgNDIxLjIyMyw1MTUuNDc3QzQyMS4yMjMsNTE4LjA2NSA0MTkuMTI4LDUyMC4xNCA0MTYuNTQ0LDUyMC4xNTZDNDEzLjk2LDUyMC4xMzkgNDExLjg2NSw1MTguMDY2IDQxMS44NjUsNTE1LjQ3N0M0MTEuODY1LDUxMi44ODkgNDEzLjk2LDUxMC43ODQgNDE2LjU0NCw1MTAuNzY3WiIgc3Ryb2tlLXdpZHRoPSIxLjFweCIgZmlsbD0idXJsKCNtYXAtbWFya2VyLTM4LWYpIiBzdHJva2U9InVybCgjbWFwLW1hcmtlci0zOC1zKSIvPgogICAgPC9nPgo8L3N2Zz4K',
      iconSize: [20, 32.8], //[50,82]
      iconAnchor: [10, 16.4],
      popupAnchor: [0, 0],
    });

    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: propertyPosition,
      zoom: 12,
      scrollWheelZoom: false,
    }).addLayer(
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        detectRetina: true,
        edgeBufferTiles: 2,
      }),
    );

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
