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

## Production Docker (apps/web)

This repository uses a Turborepo production Docker flow for `apps/web`.

- The image build uses `turbo prune web --docker` to create an app-scoped build context.
- Dependencies are installed from the pruned `out/json` manifest layer first for better Docker cache reuse.
- The app is built with `turbo run build --filter=web...` from the pruned `out/full` source.
- Runtime starts `apps/web/server.ts` (TanStack Start production server).

### Build and start

Use the existing npm scripts:

```terminal
bun run prod:up
```

To stop:

```terminal
bun run prod:down
```

### Blue-Green deployment model

Production uses two app slots behind nginx:

- `app_blue`
- `app_green`

Both slots run the same GHCR image, but only one slot is considered active at a time by the deployment script.

VPS behavior is pull-only. Images are built in CI (GitHub Actions) and the VPS only:

- pulls latest image tags from GHCR
- starts the inactive color
- waits for health to pass
- reloads nginx and stops old color

Deploy flow:

1. Pull latest image for inactive slot.
2. Start inactive slot and wait for health check (`/health`) to pass.
3. Reload nginx.
4. Stop old slot.

Manual commands:

```terminal
bun run prod:deploy
```

```terminal
bun run prod:switch:blue
```

```terminal
bun run prod:switch:green
```

Scripts:

- `scripts/prod-deploy.sh`
- `scripts/prod-switch-color.sh`

### GitHub Actions + GHCR

Workflow file:

- `.github/workflows/deploy-production.yml`

It does six jobs:

1. Build the web app artifacts.
2. Run `docker compose -f docker-compose.ci.yml build app` to produce one production app image.
3. Push `ghcr.io/<owner>/kyleweberseattle.com:latest`.
4. Build and push MLS image `ghcr.io/<owner>/kyleweberseattle.com-mls:latest` from `apps/mls/Dockerfile`.
5. Build and push DB image `ghcr.io/<owner>/kyleweberseattle.com-db:latest` from root `Dockerfile` target `db`.
6. SSH to VPS to execute `scripts/prod-deploy.sh`.

Notes:

- The VPS does not build app images.
- The VPS only pulls the latest app image and performs blue-green swapping.
- The MLS worker is deployed as a single service (`mls`) and recreated in place after image pull.

Required GitHub repository secrets:

- `REPO_TOKEN` (PAT with package read/write and repo access as needed)
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`

Important:

- Update the SSH deploy path in workflow from `/path/to/your/project` to your real VPS directory.
- Ensure VPS `packages/config/.env` defines production values used by compose.

### Media symlink behavior in production

`apps/web/public/media` is intentionally excluded from Docker build context. At container startup, the app entrypoint creates a symlink:

- source: `/srv/media` (mounted from `./store/media`)
- target: `/app/apps/web/dist/client/media`

This keeps media files on persistent storage while still being served from the built client output path.
