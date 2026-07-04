import type { StandardStatus } from '@kws/types';

import { listingsSearchShapeSchema } from '@kws/types';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  hydrateListingCardsByKeys,
  searchListingsAllMarkers,
  searchListingsCount,
  searchListingsPageMarkers,
} from '../queries/search';

const listingsSearchSchema = listingsSearchShapeSchema.partial();

const statusesSchema = z.array(z.string()).optional();

const searchCountInputSchema = z.object({
  search: listingsSearchSchema,
  statuses: statusesSchema,
});

const searchAllMarkersInputSchema = z.object({
  search: listingsSearchSchema,
  statuses: statusesSchema,
});

const searchPageMarkersInputSchema = z.object({
  search: listingsSearchSchema,
  limit: z.number().int().positive().max(500).optional().nullable(),
  cursor: z.string().nullable().optional(),
  statuses: statusesSchema,
});

const hydrateCardsInputSchema = z.object({
  listingKeys: z.array(z.string().min(1)).min(1),
  statuses: statusesSchema,
  maxBatchSize: z.number().int().positive().max(500).optional(),
});

const toStatuses = (statuses?: string[]): StandardStatus[] | undefined => {
  if (!statuses?.length) {
    return undefined;
  }

  return statuses as StandardStatus[];
};

export const searchListingsCountServerFn = createServerFn({ method: 'GET' })
  .validator(searchCountInputSchema)
  .handler(({ data }) =>
    searchListingsCount({
      search: data.search,
      statuses: toStatuses(data.statuses),
    }),
  );

export const searchAllListingMarkersServerFn = createServerFn({ method: 'GET' })
  .validator(searchAllMarkersInputSchema)
  .handler(({ data }) =>
    searchListingsAllMarkers({
      search: data.search,
      statuses: toStatuses(data.statuses),
    }),
  );

export const searchListingMarkersPageServerFn = createServerFn({ method: 'GET' })
  .validator(searchPageMarkersInputSchema)
  .handler(({ data }) =>
    searchListingsPageMarkers({
      search: data.search,
      limit: data.limit,
      cursor: data.cursor,
      statuses: toStatuses(data.statuses),
    }),
  );

export const hydrateListingCardsByKeysServerFn = createServerFn({ method: 'GET' })
  .validator(hydrateCardsInputSchema)
  .handler(({ data }) =>
    hydrateListingCardsByKeys({
      listingKeys: data.listingKeys,
      statuses: toStatuses(data.statuses),
      maxBatchSize: data.maxBatchSize,
    }),
  );
