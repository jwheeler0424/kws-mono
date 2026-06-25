// import { searchListingsCountFromRouteOptions } from '@/packages/mls/search.options';
import { toCanonicalListingsSearch } from '@kws/types';
import { createFileRoute } from '@tanstack/react-router';

// import ListingsMap from '@/components/global/listings-map';
// import ListingsResults from '@/components/global/listings-results';
// import ListingsSearch from '@/components/global/listings-search';
import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/listings/_listings/')({
  // loaderDeps exposes the canonical search params to loader so it re-runs on search change.
  loaderDeps: ({ search }) => toCanonicalListingsSearch(search),
  // Keep the listings route non-blocking for the map. Marker pages load on the client so the
  // Leaflet shell can render first and then fetch prioritized sectors in the background.
  // loader: ({ context, deps }) =>
  //   context.queryClient.ensureQueryData(searchListingsCountFromRouteOptions(deps)),
  loader: async ({ context }) => {
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
  return (
    <main className='w-full'>
      Hello darkness my old friend.
      {/* <section className='relative w-full'>
        <ListingsSearch />
        <ListingsMap params={search} />
      </section>
      <section className='content relative'>
        <ListingsResults params={search} />
      </section> */}
    </main>
  );
}
