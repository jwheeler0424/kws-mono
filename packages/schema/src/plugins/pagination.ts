import type { PgSelect } from 'drizzle-orm/pg-core';

// import { eq } from 'drizzle-orm';

// import db from '../client';
// import { user } from '../schema';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
}

export function withPagination<T extends PgSelect>(qb: T, page: number = 1, pageSize: number = 10) {
  const safePage = toPositiveInt(page, DEFAULT_PAGE);
  const safePageSize = Math.min(toPositiveInt(pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return qb.limit(safePageSize).offset((safePage - 1) * safePageSize);
}

// /** Examples */
// const query = db.select().from(user).where(eq(user.id, '1'));
// // withPagination(query, 1); // ❌ Type error - the query builder is not in dynamic mode

// const dynamicQuery = query.$dynamic();
// withPagination(dynamicQuery, 1); // ✅ OK
