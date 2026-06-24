import { createFileRoute } from '@tanstack/react-router';

import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ context }) => {
    return {
      siteConfig: context.siteConfig,
      post: {
        title: 'Sample Blog Post',
        excerpt: 'This is a sample excerpt for the blog post.',
      },
    };
  },
  head: ({ loaderData }) => {
    const { seo } = useSeo(loaderData!.siteConfig);
    return {
      meta: [
        ...seo({
          title: `${loaderData?.post.title} | KyleWeberSeattle.com`,
          description:
            loaderData?.post.excerpt ??
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
  const { slug } = Route.useParams();
  return <div>Hello "/_frontend/blog/{slug}"!</div>;
}
