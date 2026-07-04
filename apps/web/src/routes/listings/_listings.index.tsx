import type { TListingMarker } from '@kws/types';

import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import ListingsMap from '@/components/global/listings-map';
import ListingsResults from '@/components/global/listings-results';
import ListingsSearch from '@/components/global/listings-search';
import {
  hydrateListingCardsByKeysOptions,
  searchAllListingMarkersOptions,
  searchListingsPageFromRouteOptions,
} from '@/features/mls/options/search';
import { useSeo } from '@/lib/tools';

const isQueryCancellationError = (error: unknown) => {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
    return false;
  }

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    stack?: unknown;
    constructor?: { name?: unknown };
    revert?: unknown;
    silent?: unknown;
  };

  const text = [candidate.name, candidate.constructor?.name, candidate.message, candidate.stack]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  if (text.includes('cancellederror') || text.includes('cancelled') || text.includes('abort')) {
    return true;
  }

  return typeof candidate.revert === 'boolean' && 'silent' in candidate;
};

export const Route = createFileRoute('/listings/_listings/')({
  // loaderDeps mirrors route search params so loader re-runs on search change.
  loaderDeps: ({ search }) => search,
  // Keep the listings route non-blocking for the map. Marker pages load on the client so the
  // Leaflet shell can render first and then fetch prioritized sectors in the background.
  loader: async ({ context, deps }) => {
    const pageSize = deps.limit ?? 48;

    void Promise.all([
      context.queryClient.ensureQueryData(searchAllListingMarkersOptions({ search: deps })),
      context.queryClient
        .ensureQueryData(searchListingsPageFromRouteOptions(deps, { limit: pageSize }))
        .then((page) => {
          const listingKeys = page.items.map((item) => item.listingKey);

          if (listingKeys.length === 0) {
            return;
          }

          return context.queryClient.ensureQueryData(
            hydrateListingCardsByKeysOptions({ listingKeys, maxBatchSize: pageSize }),
          );
        }),
    ]).catch((error) => {
      if (isQueryCancellationError(error)) {
        return;
      }

      console.error('Listings loader prefetch failed', error);
    });

    return {
      siteConfig: context.siteConfig,
    };
  },
  head: ({ loaderData }) => {
    const { seo } = useSeo(loaderData!.siteConfig);
    return {
      meta: [
        ...seo({
          title: 'Search Available Properties | KyleWeberSeattle.com',
          description:
            'Discover all of the latest market updates and the best places to eat in Seattle.',
          keywords: [
            'blog',
            'travel',
            'buying',
            'selling',
            'home',
            'condominium',
            'condo',
            'seattle',
            'real estate',
            'broker',
          ].join(', '),
        }),
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  // useLoaderDeps returns the same canonical object passed to loader,
  // guaranteeing query key parity between loader prefetch and component queries.
  const search = Route.useLoaderDeps();
  const { data: allMarkers, isPending: isMarkersPending } = useQuery(
    searchAllListingMarkersOptions({ search }),
  );
  const markers = (allMarkers ?? []) as TListingMarker[];

  return (
    <main className='w-full'>
      <section className='relative w-full'>
        <ListingsSearch />
        <ListingsMap markers={markers} markersLoading={isMarkersPending} />
      </section>
      <section className='content relative'>
        <ListingsResults params={search} resultCount={markers.length} />
      </section>
    </main>
  );
}
