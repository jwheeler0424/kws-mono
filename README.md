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

## Production Runtime (Swarm)

Start production stack:

```terminal
bun run prod:up
```

Stop production stack:

```terminal
bun run prod:down
```

### VPS/Production Server (No package.json commands)

Use the root `.env` on the server and run bash scripts directly.

1. Prepare your root `.env` (project root) with at least:

```terminal
HOST=kyleweberseattle.com
CERTBOT_DOMAIN_FALLBACK=kyleweberseattle.com
STORE_PATH=$HOME/store/kyleweberseattle.com
```

2. Initialize persistent store folders and optional local `./store` symlink:

```terminal
bash scripts/prod-init-store.sh
```

3. Start/update production swarm stack:

```terminal
bash scripts/prod-up.sh
```

4. Inspect service status:

```terminal
bash scripts/prod-ps.sh
```

5. Stream logs (defaults to `web` service):

```terminal
bash scripts/prod-logs.sh
# or a single service
bash scripts/prod-logs.sh nginx
```

6. Stop services:

```terminal
bash scripts/prod-down.sh
```

Optional teardown with volume deletion:

```terminal
WIPE_DATA=1 bash scripts/prod-down.sh
```

Notes:

- Production scripts default to `.env` via `COMPOSE_ENV_FILE=.env`.
- Compose files now support `COMPOSE_ENV_FILE` for service `env_file` resolution.
- `prod-up` defaults `STORE_PATH` to `$HOME/store/kyleweberseattle.com` and `HOST`/certbot domain to `kyleweberseattle.com` when unset.
- `prod-up` deploys swarm stack `kws` by default; override with `STACK_NAME=...`.

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
