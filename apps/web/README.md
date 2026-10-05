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
popups and map events. The default is OpenStreetMap's hosted Shortbread vector tiles with the
Colorful style. No API key or self-hosted tile archive is needed. Attribution remains visible in
Leaflet's map control.

The public service is best-effort, not an SLA-backed production service. Follow its
[vector tile usage policy](https://operations.osmfoundation.org/policies/vector/): keep attribution,
allow the browser to send a Referer, honor browser caching, and do not bulk-download, prefetch or
build offline archives from the service. A small project supporting a business can still be
commercial use.

To select another hosted MapLibre style, set `VITE_BASEMAP_STYLE_URL` in the web app's Vite
environment configuration. Restart the development server or rebuild the production app after
changing this value. The chosen provider's terms and attribution requirements must also be followed.
