import { mlsSyncCursors } from '@kws/schema';
import { listingsSearchShapeSchema } from '@kws/types';
import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/database';

import {
  getHydratedListingsPaginated,
  getListingDetailByKey,
  getListingsForSearchAndFilter,
} from '../queries';

const listingDetailsParamsSchema = z.object({ listingKey: z.string().min(1) });
const listingsSearchParamsSchema = listingsSearchShapeSchema.partial();
const hydratedListingsPaginatedParamsSchema = z.object({
  sessionId: z.string().uuid(),
  limit: z.number().int().positive().max(250).optional().nullable(),
  cursor: z.string().optional().nullable(),
});

export const getPropertiesLastUpdatedServerFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [cursor] = await db
      .select({ lastRunAt: mlsSyncCursors.lastRunAt })
      .from(mlsSyncCursors)
      .where(
        and(eq(mlsSyncCursors.resource, 'Property'), eq(mlsSyncCursors.lastRunStatus, 'success')),
      )
      .orderBy(desc(mlsSyncCursors.lastRunAt))
      .limit(1);

    return cursor?.lastRunAt?.toISOString() ?? null;
  },
);

export const getListingDetailsServerFn = createServerFn({ method: 'GET' })
  .validator(listingDetailsParamsSchema)
  .handler(({ data }) => getListingDetailByKey(data));

export const getListingsForSearchAndFilterServerFn = createServerFn({ method: 'GET' })
  .validator(listingsSearchParamsSchema)
  .handler(({ data }) => getListingsForSearchAndFilter(data));

export const getHydratedListingsPaginatedServerFn = createServerFn({ method: 'POST' })
  .validator(hydratedListingsPaginatedParamsSchema)
  .handler(({ data }) =>
    getHydratedListingsPaginated({
      sessionId: data.sessionId,
      limit: data.limit,
      cursor: data.cursor,
    }),
  );
