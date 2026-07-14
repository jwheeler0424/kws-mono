# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS prepare
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune @kws/schema --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN bun install --linker=isolated --backend=copyfile
COPY --from=prepare /app/out/full/ .

# Ensure migration runtime packages are available in the migration image.
RUN cd /app/packages/schema \
  && bun x drizzle-kit --version \
  && bun --eval "import 'drizzle-orm'; import 'pg';"

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app /app

WORKDIR /app/packages/schema
CMD ["sh", "-lc", "bun run db:migrate && bun run db:push"]
