# KyleWeberSeattle.com Monorepo

## Notes

- Create symlink for web media folder to store media folder **Windows CMD**

  ```terminal
  mklink /D "C:\Projects\kws-mono\apps\web\public\media" "C:\Projects\kws-mono\store\media"
  ```

  **Linux Terminal**

  ```terminal
  ln -s ~/Projects/kws-mono/apps/web/public/media ~/Projects/kws-mono/store/media
  ```

  **MacOS Terminal**

  ```terminal
  ln -s ~/Projects/kws-mono/apps/web/public/media ~/Projects/kws-mono/store/media
  ```

## Build

Build everything in the monorepo:

```terminal
bun run build
```

## Deploy Images (local command)

This is the single deploy packaging command:

```terminal
bun run deploy:images
```

It performs:

1. `turbo run build`
2. `docker compose -f docker-compose.ci.yml build app mls db`
3. pushes images to GHCR:
   - `ghcr.io/<owner>/kyleweberseattle.com:latest`
   - `ghcr.io/<owner>/kyleweberseattle.com-mls:latest`
   - `ghcr.io/<owner>/kyleweberseattle.com-db:latest`

### Optional environment overrides

```terminal
REGISTRY=ghcr.io \
IMAGE_NAME=<owner>/kyleweberseattle.com \
MLS_IMAGE_NAME=<owner>/kyleweberseattle.com-mls \
DB_IMAGE_NAME=<owner>/kyleweberseattle.com-db \
bun run deploy:images
```

## Production Runtime Compose

Start production stack:

```terminal
bun run prod:up
```

Stop production stack:

```terminal
bun run prod:down
```

### Media symlink behavior in production

`apps/web/public/media` is intentionally excluded from Docker build context. At container startup, the app entrypoint creates a symlink:

- source: `/srv/media`
- target: `/app/apps/web/dist/client/media`

For production compose, media mount path is configurable with `MEDIA_STORE_PATH`.
