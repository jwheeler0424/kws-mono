# KyleWeberSeattle.com Monorepo

## Notes

- Create symlink for web media folder to store media folder **Windows CMD**

  ```terminal
  mklink /D "C:\Projects\kws-mono\apps\web\public\media" "C:\Projects\kws-mono\store\media"
  ```
  ```terminal
  mklink /D "C:\Projects\kws-mono\apps\mls\data" "C:\Projects\kws-mono\store\data"
  ```

  **Linux Terminal**

  ```terminal
  ln -s ~/Projects/kws-mono/apps/web/public/media ~/Projects/kws-mono/store/media
  ```
  ```terminal
  ln -s ~/Projects/kws-mono/apps/mls/data ~/Projects/kws-mono/store/data
  ```

  **MacOS Terminal**

  ```terminal
  ln -s ~/Projects/kws-mono/apps/web/public/media ~/Projects/kws-mono/store/media
  ```
  ```terminal
  ln -s ~/Projects/kws-mono/apps/mls/data ~/Projects/kws-mono/store/data
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

## Local Production Rehearsal (minimal root env)

Use the root `.env.local.prod` for minimal compose-only variables (images, DB/Redis/app ports, host/media path).
Keep full runtime app configuration in `packages/config/.env`.

Start local production rehearsal:

```terminal
bun run prod:local:up
```

Check service status:

```terminal
bun run prod:local:ps
```

Stop local production rehearsal:

```terminal
bun run prod:local:down
```

## Local Swarm Rehearsal (rolling updates)

Use Docker Swarm locally to validate production-like rolling updates.

Start/deploy stack:

```terminal
bun run swarm:local:up
```

Update stack after pushing new images:

```terminal
bun run swarm:local:update
```

View services:

```terminal
bun run swarm:local:ps
```

Remove stack:

```terminal
bun run swarm:local:down
```

Update semantics in Swarm stack:

1. `web` runs with `WEB_REPLICAS` (default `2`) and `start-first` rolling updates.
2. `mls` runs single-replica by default and updates with `stop-first`.

Optional overrides:

```terminal
WEB_REPLICAS=3 MLS_REPLICAS=1 STACK_NAME=kws bun run swarm:local:up
```

Migration behavior:

```terminal
# Default is RUN_MIGRATIONS=0 for local rollout validation
bun run swarm:local:up

# Enable one-time migration stage when needed
RUN_MIGRATIONS=1 bun run swarm:local:up
```

### Media symlink behavior in production

`apps/web/public/media` is intentionally excluded from Docker build context. At container startup, the app entrypoint creates a symlink:

- source: `/srv/media`
- target: `/app/apps/web/public/media`

For production compose, media/data mount root is configurable with `STORE_PATH`.

For VPS production, set:

```terminal
STORE_PATH=$HOME/store/kyleweberseattle.com
```

For local production rehearsal, set in `.env.local.prod`:

```terminal
STORE_PATH=./store
```
