import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation';
import { useSeo } from '@/lib/tools';
import { cn } from '@/lib/utils';

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
          title: `Let's Discover Seattle`,
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
  const viewportRef = React.useRef<HTMLDivElement>(null);
  return (
    <main className='w-full'>
      {/* Hero */}
      <ParallaxContainer className='banner-short relative flex items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            className='h-full w-full object-cover'
            src='/assets/images/compass/seattle.webp'
            alt='Seattle skyline at dusk'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article className='banner banner-title flex'>
            <main>
              <h1>Let's Discover Seattle</h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content page-content relative'>
        <section className='flex w-full flex-col gap-4'>
          <h2 className='m-0 text-3xl sm:text-4xl lg:text-5xl'>Recent Blog Posts</h2>
          <p className='m-0'>
            {`Welcome to the blog! Here you'll find a collection of articles
				covering a variety of topics, from the latest market updates to the
				best places to eat in Seattle. Check back often for new posts!`}
          </p>
        </section>
        <section className='w-full h-full' ref={viewportRef}>
          {/* <main className='grid items-center justify-center w-full grid-cols-1 gap-8 p-4 auto-rows-auto place-items-center lgmb:px-8 lgmb:py-0 smtb:grid-cols-2 smtb:gap-4 smtb:px-1 smtb:py-2 mdtb:gap-12 lgtb:gap-16 xltb:gap-8 2xltb:gap-12 xsdt:grid-cols-3 xsdt:gap-6 smdt:grid-cols-4 smdt:gap-8 mddt:gap-12 lgdt:gap-16 xldt:grid-cols-5 xldt:gap-10 2xldt:gap-12'>
						{viewData.map((post, index) => {
							return index === viewData.length - overscanCount &&
								totalFetched <= totalCount &&
								pageCount < totalPages ? (
								<InView onChange={fetchNextData} threshold={0.2} key={post.id}>
									{({ ref }) => {
										return <PostCard post={post} ref={ref} key={post.id} />;
									}}
								</InView>
							) : (
								<PostCard post={post} key={post.id} />
							);
						})}
					</main>
					{isFetchingNextPage ||
						(isLoading && (
							<main
								className={cn(
									'flex h-full w-full flex-1 items-center justify-center py-20'
								)}
							>
								<BeatLoader color='#ee2127' />
							</main>
						))} */}
          <main
            className={cn('flex h-full w-full flex-1 items-center justify-center py-10 sm:py-16')}>
            <p className='m-0 text-neutral-600'>New posts are coming soon.</p>
          </main>
        </section>
      </article>
    </main>
  );
}
