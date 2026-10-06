# web

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast
all-in-one JavaScript runtime.

## Basemap

Both maps use MapLibre through the Leaflet adapter, retaining the existing markers, clustering,
popups and map events. The default is OpenFreeMap's Liberty style with OpenStreetMap-derived vector
tiles. Its style and tile metadata support cross-origin requests from both local and production
sites. No API key or self-hosted tile archive is needed. OpenFreeMap, OpenMapTiles, and
OpenStreetMap attribution remains visible in Leaflet's map control.

The public service is best-effort, not an SLA-backed production service. Follow its
[setup documentation](https://openfreemap.org/quick_start/) for hosted or self-hosted deployment.
Keep the supplied attribution and honor browser caching.

To select another hosted MapLibre style, set `VITE_BASEMAP_STYLE_URL` in the web app's Vite
environment configuration. Restart the development server or rebuild the production app after
changing this value. The chosen provider's terms and attribution requirements must also be followed.
