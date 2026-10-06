/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ListingsResults } from './listings-results';

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { sessionId: 'test-session', total: 35436 },
    isPending: false,
    isFetching: false,
  }),
  useInfiniteQuery: () => ({
    data: { pages: [{ items: [] }] },
    isPending: false,
    isFetching: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn<() => Promise<void>>(),
  }),
}));
vi.mock('@/features/mls/options/listings', () => ({
  listingsForSearchAndFilterOptions: () => ({}),
  hydratedListingsPaginatedInfiniteOptions: () => ({}),
}));
vi.mock('./listings-section', () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

afterEach(cleanup);

describe('ListingsResults heading', () => {
  it('formats the result total with thousands separators', () => {
    render(<ListingsResults params={{}} />);

    expect(screen.getByRole('heading').textContent).toBe('Search Results (35,436)');
  });
});
