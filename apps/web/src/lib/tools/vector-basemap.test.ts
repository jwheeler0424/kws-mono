import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createVectorBasemapLayer, transformVectorBasemapStyle } from './vector-basemap';

const layerMocks = vi.hoisted(() => ({
  once: vi.fn(),
  setStyle: vi.fn(),
}));

vi.mock('@maplibre/maplibre-gl-leaflet', () => ({
  maplibreGL: vi.fn(() => ({
    options: {},
    once: layerMocks.once,
    getMaplibreMap: () => ({ setStyle: layerMocks.setStyle }),
  })),
}));
vi.mock('maplibre-gl', () => ({ setWorkerUrl: vi.fn<(url: string) => void>() }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Hosted vector basemap', () => {
  it('defaults to the publicly cross-origin accessible OpenFreeMap style', async () => {
    vi.stubEnv('VITE_BASEMAP_STYLE_URL', '');
    vi.resetModules();
    const basemap = await import('./vector-basemap');
    const layer = basemap.createVectorBasemapLayer();

    expect(basemap.VECTOR_BASEMAP_STYLE).toBe('https://tiles.openfreemap.org/styles/liberty');
    const onAdd = layerMocks.once.mock.calls.at(-1)?.[1] as (() => void) | undefined;
    onAdd?.();
    expect(layerMocks.setStyle).toHaveBeenCalledWith(
      'https://tiles.openfreemap.org/styles/liberty',
      { transformStyle: basemap.transformVectorBasemapStyle },
    );
    expect(layer.getAttribution?.()).toContain('https://openfreemap.org');
    expect(layer.getAttribution?.()).toContain('https://www.openmaptiles.org/');
    expect(layer.getAttribution?.()).toContain('OpenStreetMap');
  });

  it('preserves the configured style override', async () => {
    vi.stubEnv('VITE_BASEMAP_STYLE_URL', ' https://maps.example.test/custom.json ');
    vi.resetModules();
    const basemap = await import('./vector-basemap');
    const layer = basemap.createVectorBasemapLayer();

    expect(basemap.VECTOR_BASEMAP_STYLE).toBe('https://maps.example.test/custom.json');
    const onAdd = layerMocks.once.mock.calls.at(-1)?.[1] as (() => void) | undefined;
    onAdd?.();
    expect(layerMocks.setStyle).toHaveBeenCalledWith('https://maps.example.test/custom.json', {
      transformStyle: basemap.transformVectorBasemapStyle,
    });
    expect(layer.getAttribution?.()).not.toContain('OpenFreeMap');
  });

  it('uses a hosted style while leaving interactions with Leaflet', () => {
    createVectorBasemapLayer();
    expect(maplibreGL).toHaveBeenCalledWith({
      style: expect.objectContaining({ version: 8, sources: {}, layers: expect.any(Array) }),
      interactive: false,
      attributionControl: false,
    });
    expect(layerMocks.once).toHaveBeenCalledWith('add', expect.any(Function));
    expect(setWorkerUrl).toHaveBeenCalledWith(expect.any(String));
  });

  it('coerces nullable numeric fields in the hosted shield and boundary filters', () => {
    const style = {
      version: 8,
      sources: {},
      layers: [
        {
          id: 'highway-shield-non-us',
          type: 'symbol',
          filter: ['all', ['<=', ['get', 'ref_length'], 6]],
        },
        {
          id: 'boundary_3',
          type: 'line',
          filter: ['all', ['>=', ['get', 'admin_level'], 3], ['<=', ['get', 'admin_level'], 6]],
        },
        {
          id: 'unrelated-layer',
          type: 'symbol',
          filter: ['<=', ['get', 'rank'], 6],
        },
      ],
    } as unknown as Parameters<typeof transformVectorBasemapStyle>[1];

    const transformed = transformVectorBasemapStyle(undefined, style);
    const layers = transformed.layers as Array<{ filter?: unknown }>;

    expect(layers[0].filter).toEqual([
      'all',
      ['>', ['to-number', ['get', 'ref_length'], 0], 0],
      ['<=', ['to-number', ['get', 'ref_length'], 0], 6],
    ]);
    expect(layers[1].filter).toEqual([
      'all',
      ['>=', ['to-number', ['get', 'admin_level'], 0], 3],
      ['<=', ['to-number', ['get', 'admin_level'], 0], 6],
    ]);
    expect(layers[2].filter).toEqual(['<=', ['get', 'rank'], 6]);
  });

  it('keeps OpenStreetMap attribution on each independent layer', () => {
    const first = createVectorBasemapLayer();
    const second = createVectorBasemapLayer();
    expect(first).not.toBe(second);
    expect(first.getAttribution?.()).toContain('https://www.openstreetmap.org/copyright');
    expect(first.getAttribution?.()).toContain('OpenStreetMap');
    expect(second.getAttribution?.()).toBe(first.getAttribution?.());
  });
});
