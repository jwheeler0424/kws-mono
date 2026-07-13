# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS prepare
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune mls --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN bun install --linker=isolated
COPY --from=prepare /app/out/full/ .
ARG SKIP_MLS_BUILD=1
RUN if [ "$SKIP_MLS_BUILD" = "1" ]; then \
      echo "Skipping mls build; running source directly with Bun"; \
    else \
      bunx turbo run build --filter=mls...; \
    fi

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app /app

# Ensure runtime config package env files are present in the final image.
RUN test -f /app/packages/config/.env && test -f /app/packages/config/.env.example

CMD ["bun", "--bun", "run", "apps/mls/src/index.ts"]
