import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

import { createVectorBasemapLayer } from '@/lib/tools/vector-basemap';

export function VectorBasemapLayer() {
  const map = useMap();

  useEffect(() => {
    const layer = createVectorBasemapLayer().addTo(map);
    return () => {
      layer.remove();
    };
  }, [map]);

  return null;
}
