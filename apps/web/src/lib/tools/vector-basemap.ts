import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

export const VECTOR_BASEMAP_STYLE =
  import.meta.env.VITE_BASEMAP_STYLE_URL?.trim() || 'https://tiles.openfreemap.org/styles/liberty';

const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const attribution = VECTOR_BASEMAP_STYLE.startsWith('https://tiles.openfreemap.org/')
  ? `<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> | ${osmAttribution}`
  : osmAttribution;

const INITIAL_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'basemap-placeholder',
      type: 'background',
      paint: { 'background-color': '#f8f4f0' },
    },
  ],
};

const NULLABLE_NUMERIC_FILTER_FIELDS: Record<string, string> = {
  'highway-shield-non-us': 'ref_length',
  'highway-shield-us-interstate': 'ref_length',
  road_shield_us: 'ref_length',
  boundary_3: 'admin_level',
};

function guardNullNumericComparisons(expression: unknown, field: string): unknown {
  if (!Array.isArray(expression)) return expression;

  const [operator, operand, ...rest] = expression;
  if (
    ['<', '<=', '>', '>='].includes(String(operator)) &&
    Array.isArray(operand) &&
    operand[0] === 'get' &&
    operand[1] === field
  ) {
    return [
      operator,
      ['to-number', operand, 0],
      ...rest.map((value) => guardNullNumericComparisons(value, field)),
    ];
  }

  return expression.map((value) => guardNullNumericComparisons(value, field));
}

export function transformVectorBasemapStyle(
  _previousStyle: StyleSpecification | undefined,
  nextStyle: StyleSpecification,
): StyleSpecification {
  return {
    ...nextStyle,
    layers: nextStyle.layers.map((layer) => {
      const field = NULLABLE_NUMERIC_FILTER_FIELDS[layer.id];
      const filter = 'filter' in layer ? layer.filter : undefined;
      if (!field || !filter) return layer;

      const sanitizedFilter = guardNullNumericComparisons(filter, field);
      const safeFilter =
        field === 'ref_length' && Array.isArray(sanitizedFilter)
          ? [
              'all',
              ['>', ['to-number', ['get', field], 0], 0],
              ...(sanitizedFilter[0] === 'all' ? sanitizedFilter.slice(1) : [sanitizedFilter]),
            ]
          : sanitizedFilter;

      return {
        ...layer,
        filter: safeFilter as typeof filter,
      } as typeof layer;
    }),
  };
}

export function createVectorBasemapLayer() {
  setWorkerUrl(workerUrl);

  const layer = maplibreGL({
    style: INITIAL_STYLE,
    interactive: false,
    attributionControl: false,
  });

  layer.once('add', () => {
    layer.getMaplibreMap().setStyle(VECTOR_BASEMAP_STYLE, {
      transformStyle: transformVectorBasemapStyle,
    });
  });

  layer.getAttribution = () => attribution;
  return layer;
}
