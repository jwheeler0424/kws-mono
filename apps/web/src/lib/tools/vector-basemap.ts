import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

export const VECTOR_BASEMAP_STYLE =
  import.meta.env.VITE_BASEMAP_STYLE_URL?.trim() || 'https://tiles.openfreemap.org/styles/liberty';

const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const attribution = VECTOR_BASEMAP_STYLE.startsWith('https://tiles.openfreemap.org/')
  ? `<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> | ${osmAttribution}`
  : osmAttribution;

export function createVectorBasemapLayer() {
  setWorkerUrl(workerUrl);

  const layer = maplibreGL({
    style: VECTOR_BASEMAP_STYLE,
    interactive: false,
    attributionControl: false,
  });
  layer.getAttribution = () => attribution;
  return layer;
}
