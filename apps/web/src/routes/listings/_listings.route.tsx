import { listingsSearchShapeSchema, type TListingsSearch } from '@kws/types';
import { createFileRoute, Outlet } from '@tanstack/react-router';

const validateListingsSearch = (value: unknown): Partial<TListingsSearch> => {
  const parsed = listingsSearchShapeSchema.partial().safeParse(value);

  if (!parsed.success) {
    return {};
  }

  return parsed.data;
};

export const Route = createFileRoute('/listings/_listings')({
  validateSearch: validateListingsSearch,
  component: () => <Outlet />,
});
