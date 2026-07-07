import type L from 'leaflet';

const LEAFLET_REGISTRY_KEY = '__KWS_LEAFLET_REGISTRY__' as const;

type LeafletRegistry = {
  initialized: boolean;
  maps: Set<L.Map>;
  edgeBufferImportPromise: Promise<unknown> | null;
};

type LeafletGlobalStore = {
  [LEAFLET_REGISTRY_KEY]?: unknown;
};

function getLeafletRegistry(): LeafletRegistry {
  const globals = globalThis as LeafletGlobalStore;
  const existing = globals[LEAFLET_REGISTRY_KEY] as LeafletRegistry | undefined;

  if (existing) {
    return existing;
  }

  const created: LeafletRegistry = {
    initialized: false,
    maps: new Set(),
    edgeBufferImportPromise: null,
  };

  globals[LEAFLET_REGISTRY_KEY] = created;
  return created;
}

export function ensureLeafletRegistered() {
  if (typeof window === 'undefined') {
    return;
  }

  const registry = getLeafletRegistry();

  if (registry.initialized) {
    return;
  }

  registry.edgeBufferImportPromise ??= import('leaflet-edgebuffer').catch(() => null);
  registry.initialized = true;
}

export function registerLeafletMap(map: L.Map) {
  const registry = getLeafletRegistry();
  registry.maps.add(map);

  return () => {
    registry.maps.delete(map);
  };
}

export function cleanupLeafletForHotReload() {
  if (typeof window === 'undefined') {
    return;
  }

  const registry = getLeafletRegistry();

  for (const map of registry.maps) {
    map.off();
    map.eachLayer((layer) => {
      map.removeLayer(layer);
    });
    map.remove();
  }

  registry.maps.clear();
}
