import { createFileRoute } from '@tanstack/react-router';

import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/blog/')({
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
          title: 'KyleWeberSeattle.com | Real Estate & Experiences',
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
  return <div className='w-full'>Hello "/_frontend/blog/"!</div>;
}
