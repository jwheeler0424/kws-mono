import { createFileRoute } from '@tanstack/react-router';

import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ context, params }) => {
    // TODO: Fetch by params.slug once blog persistence is wired.

    return {
      siteConfig: context.siteConfig,
      post: {
        slug: params.slug,
        title: 'Sample Blog Post',
        excerpt: 'This is a sample excerpt for the blog post.',
      },
    };
  },
  head: ({ loaderData }) => {
    const { seo } = useSeo(loaderData!.siteConfig);
    const postPath = `/blog/${loaderData?.post.slug ?? ''}`;
    const postUrl = `${loaderData?.siteConfig.siteUrl}${postPath}`;

    return {
      meta: [
        ...seo({
          title: loaderData?.post.title ?? 'Blog Post',
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
          type: 'article',
          url: postUrl,
          twitter: {
            card: 'summary_large_image',
          },
        }),
      ],
      links: [{ rel: 'canonical', href: postUrl }],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <div>Hello "/_frontend/blog/{slug}"!</div>;
}
