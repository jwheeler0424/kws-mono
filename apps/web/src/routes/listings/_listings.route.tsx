import { listingsSearchSchema } from '@kws/types';
import { createFileRoute, Outlet, stripSearchParams } from '@tanstack/react-router';

const DEFAULT_LISTINGS_SEARCH = {
  query: null,
  limit: null,
  price: null,
  sqFt: null,
  bedrooms: null,
  bathrooms: null,
  useMapBounds: false,
  bounds: null,
  sortBy: null,
  proximity: null,
} as const;

export const Route = createFileRoute('/listings/_listings')({
  validateSearch: listingsSearchSchema,
  search: {
    middlewares: [stripSearchParams(DEFAULT_LISTINGS_SEARCH)],
  },
  component: () => <Outlet />,
});
