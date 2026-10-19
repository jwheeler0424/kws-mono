/* @vitest-environment jsdom */

import { QueryClient } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  property: {
    listingKey: 'NWM_VISIT',
    standardStatus: 'Active',
    NWM: null,
    media: [{ mediaURL: '/one.webp' }],
    galleryRequestStatus: null as string | null,
  },
  request: vi.fn<(args: { data: { listingKey: string } }) => Promise<{ status: string }>>(),
  query: vi.fn<(options: unknown) => void>(),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: unknown) => ({
    options,
    useLoaderData: () => ({ property: state.property }),
    useParams: () => ({ listingKey: state.property.listingKey }),
  }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: (options: unknown) => {
    state.query(options);
    return { data: state.property };
  },
}));
vi.mock('@/features/mls/functions/listings', () => ({
  requestListingGalleryServerFn: state.request,
}));
vi.mock('@/features/mls/options', () => ({
  listingDetailOptions: ({ listingKey }: { listingKey: string }) => ({
    queryKey: ['listings', 'detail', listingKey],
    queryFn: async () => state.property,
  }),
}));
vi.mock('@/components/global/property-slideshow', () => ({
  PropertySlideshow: ({ media }: { media: unknown[] }) => (
    <div data-testid='slideshow'>{media.length}</div>
  ),
}));
vi.mock('@/components/global/map-wrapper', () => ({ default: () => null }));
vi.mock('@/components/global/link', () => ({ Link: () => null }));
vi.mock('@/lib/tools', () => ({ useSeo: () => ({ seo: () => [] }) }));

import { Route } from '@/routes/listings/$listingKey';

import { isAutomatedGalleryVisit } from './gallery-visit';

type Loader = (args: {
  context: { queryClient: QueryClient; siteConfig: object };
  params: { listingKey: string };
  preload: boolean;
}) => Promise<{ property: typeof state.property }>;
const loader = Route.options.loader as unknown as Loader;

beforeEach(() => {
  vi.clearAllMocks();
  state.property = {
    listingKey: 'NWM_VISIT',
    standardStatus: 'Active',
    NWM: null,
    media: [{ mediaURL: '/one.webp' }],
    galleryRequestStatus: null,
  };
  state.request.mockResolvedValue({ status: 'queued' });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('listing route gallery acquisition', () => {
  it('does not enqueue a prefetched listing', async () => {
    const queryClient = new QueryClient();
    await loader({
      context: { queryClient, siteConfig: {} },
      params: { listingKey: 'NWM_VISIT' },
      preload: true,
    });
    expect(state.request).not.toHaveBeenCalled();
  });
  it('enqueues an actual load without waiting for downloads', async () => {
    const queryClient = new QueryClient();
    const result = await loader({
      context: { queryClient, siteConfig: {} },
      params: { listingKey: 'NWM_VISIT' },
      preload: false,
    });
    expect(state.request).toHaveBeenCalledOnce();
    expect(result.property.media).toHaveLength(1);
    expect(result.property.galleryRequestStatus).toBe('queued');
  });
  it('still loads existing photos when enqueueing fails', async () => {
    state.request.mockRejectedValue(new Error('worker queue unavailable'));
    const result = await loader({
      context: { queryClient: new QueryClient(), siteConfig: {} },
      params: { listingKey: 'NWM_VISIT' },
      preload: false,
    });
    expect(result.property.media).toHaveLength(1);
  });
  it('excludes identifiable crawlers and speculative fetches', async () => {
    expect(isAutomatedGalleryVisit('Googlebot')).toBe(true);
    expect(isAutomatedGalleryVisit('Mozilla/5.0', 'prefetch')).toBe(true);
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Googlebot');
    await loader({
      context: { queryClient: new QueryClient(), siteConfig: {} },
      params: { listingKey: 'NWM_VISIT' },
      preload: false,
    });
    expect(state.request).not.toHaveBeenCalled();
  });
  it('passes refreshed media directly to PropertySlideshow and stops polling on completion', async () => {
    const Component = Route.options.component as (() => React.ReactNode) & {
      preload?: () => Promise<void>;
    };
    await Component.preload?.();
    const view = render(<Component />);
    expect((await screen.findByTestId('slideshow')).textContent).toBe('1');
    state.property = {
      ...state.property,
      media: [{ mediaURL: '/one.webp' }, { mediaURL: '/two.webp' }],
      galleryRequestStatus: 'complete',
    };
    view.rerender(<Component />);
    expect(screen.getByTestId('slideshow').textContent).toBe('2');
    const options = state.query.mock.lastCall![0] as {
      refetchInterval: (query: unknown) => number | false;
    };
    expect(options.refetchInterval({ state: { data: { galleryRequestStatus: 'queued' } } })).toBe(
      2000,
    );
    expect(options.refetchInterval({ state: { data: { galleryRequestStatus: 'complete' } } })).toBe(
      false,
    );
  });
});
