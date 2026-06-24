import type { PgSelect } from 'drizzle-orm/pg-core';

// import { eq } from 'drizzle-orm';

// import db from '../client';
// import { user } from '../schema';

export function withPagination<T extends PgSelect>(qb: T, page: number = 1, pageSize: number = 10) {
  return qb.limit(pageSize).offset((page - 1) * pageSize);
}

// /** Examples */
// const query = db.select().from(user).where(eq(user.id, '1'));
// // withPagination(query, 1); // ❌ Type error - the query builder is not in dynamic mode

// const dynamicQuery = query.$dynamic();
// withPagination(dynamicQuery, 1); // ✅ OK
