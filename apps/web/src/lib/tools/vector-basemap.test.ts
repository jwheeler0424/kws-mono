import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createVectorBasemapLayer, VECTOR_BASEMAP_STYLE } from './vector-basemap';

vi.mock('@maplibre/maplibre-gl-leaflet', () => ({
  maplibreGL: vi.fn<() => { options: { attribution?: string } }>(() => ({ options: {} })),
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
    expect(maplibreGL).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'https://maps.example.test/custom.json',
      }),
    );
    expect(layer.getAttribution?.()).not.toContain('OpenFreeMap');
  });

  it('uses a hosted style while leaving interactions with Leaflet', () => {
    createVectorBasemapLayer();
    expect(maplibreGL).toHaveBeenCalledWith({
      style: VECTOR_BASEMAP_STYLE,
      interactive: false,
      attributionControl: false,
    });
    expect(setWorkerUrl).toHaveBeenCalledWith(expect.any(String));
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
