import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getListingDetailByKey, getListingMarkers } from '../queries';

const listingDetailsParamsSchema = z.object({
  listingKey: z.string().min(1),
});

export const getListingDetailsServerFn = createServerFn({ method: 'GET' })
  .validator(listingDetailsParamsSchema)
  .handler(({ data }) => getListingDetailByKey(data));

export const getListingMarkersServerFn = createServerFn({ method: 'GET' })
  .handler(() => getListingMarkers());