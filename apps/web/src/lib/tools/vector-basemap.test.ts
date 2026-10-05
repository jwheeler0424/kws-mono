import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createVectorBasemapLayer, VECTOR_BASEMAP_STYLE } from './vector-basemap';

vi.mock('@maplibre/maplibre-gl-leaflet', () => ({
  maplibreGL: vi.fn<() => { options: { attribution?: string } }>(() => ({ options: {} })),
}));
vi.mock('maplibre-gl', () => ({ setWorkerUrl: vi.fn<(url: string) => void>() }));

beforeEach(() => vi.clearAllMocks());

describe('Hosted vector basemap', () => {
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
