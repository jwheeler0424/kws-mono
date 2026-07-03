# Pagination Plugin

Offset pagination helper for Drizzle query builders, implemented in
packages/schema/src/plugins/pagination.ts.

## Why this plugin exists

1. Centralize pagination normalization logic.
2. Prevent invalid limit/offset inputs from leaking into query construction.
3. Apply safe defaults and a hard page-size cap.
4. Keep call sites small and consistent.

## Export

- withPagination

## API

```ts
withPagination<T extends PgSelect>(qb: T, page = 1, pageSize = 10): T
```

Parameters:

1. qb: dynamic Drizzle PgSelect query builder.
2. page: 1-based page index requested by caller.
3. pageSize: requested number of rows per page.

Return value:

1. The same query builder type, with limit(...) and offset(...) applied.

## Current normalization constants

Configured in plugin source:

1. DEFAULT_PAGE = 1
2. DEFAULT_PAGE_SIZE = 10
3. MAX_PAGE_SIZE = 100

## Normalization algorithm

The plugin normalizes numeric inputs before applying pagination:

1. If value is not finite, fallback is used.
2. Value is floored to an integer.
3. If floored value <= 0, fallback is used.
4. pageSize is capped at MAX_PAGE_SIZE.

Effective values:

1. safePage = positive normalized page, fallback 1.
2. safePageSize = positive normalized page size, capped to 100.
3. offset = (safePage - 1) \* safePageSize.

Applied builder calls:

```ts
qb.limit(safePageSize).offset((safePage - 1) * safePageSize);
```

## Input-to-output examples

```ts
withPagination(qb, 1, 10); // limit 10,  offset 0
withPagination(qb, 2, 25); // limit 25,  offset 25
withPagination(qb, 0, 0); // limit 10,  offset 0
withPagination(qb, -2.7, 5.9); // limit 5,   offset 0
withPagination(qb, 2, 5000); // limit 100, offset 100
withPagination(qb, Infinity, 50); // limit 50, offset 0
withPagination(qb, 3, NaN); // limit 10,  offset 20
```

## Recommended usage pattern

```ts
import { asc } from 'drizzle-orm';

import { withPagination } from '../../plugins/pagination';

const base = db
  .select()
  .from(properties)
  .where(filters)
  .orderBy(asc(properties.listingKey))
  .$dynamic();

const paged = withPagination(base, page, pageSize);
```

Guidelines:

1. Use deterministic orderBy before applying offset pagination.
2. Keep page and pageSize as untrusted input until normalized by helper.
3. Use consistent default values at API/controller boundaries.

## Performance considerations

1. This helper prevents oversized page payloads by capping pageSize.
2. It does not remove deep-offset scan cost for very large page numbers.
3. For deep-scroll or high-traffic endpoints, keyset pagination is typically more efficient.
4. Combine pagination with selective filters and supporting indexes for stable latency.

## Common pitfalls

1. Missing orderBy can produce unstable page boundaries between requests.
2. Large page values can still be expensive even with capped pageSize.
3. Applying pagination before critical filters can degrade result quality and speed.

## Test coverage

Behavioral tests live in packages/schema/src/plugins/pagination.test.ts and currently cover:

1. fallback defaults for invalid values.
2. normalization of negative and fractional values.
3. maximum page-size cap enforcement.

## Recommended future test additions

1. Explicit Infinity and NaN test vectors.
2. Type-level tests for PgSelect compatibility guarantees.
3. Integration tests with ordered query builders to validate stable page slicing.
