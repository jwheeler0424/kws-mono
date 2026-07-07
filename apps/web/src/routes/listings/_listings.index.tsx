import { createFileRoute } from '@tanstack/react-router';

import ListingsMap from '@/components/global/listings-map';
import ListingsResults from '@/components/global/listings-results';
import ListingsSearch from '@/components/global/listings-search';
import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/listings/_listings/')({
  // loaderDeps mirrors route search params so loader re-runs on search change.
  loaderDeps: ({ search }) => search,
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
  const search = Route.useSearch();

  return (
    <main className='w-full'>
      <section className='relative w-full'>
        <ListingsSearch search={search} />
        <ListingsMap search={search} />
      </section>
      <section className='content relative'>
        <ListingsResults params={search} />
      </section>
    </main>
  );
}
