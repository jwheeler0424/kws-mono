import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { BeatLoader } from 'react-spinners';

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
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            className='h-full w-full object-cover object-top'
            src='/assets/images/blog-page.jpg'
            alt='Blog Banner - Seattle Night time'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer range={75} speed={0.68}>
          <article className='banner banner-title flex'>
            <main className='relative top-[clamp(15vh,calc(10vh-4rem),25vh)] px-0 py-[clamp(1.25rem,1.65vw-2.16rem,6rem)]'>
              <h1 className='relative w-full text-left text-7xl font-medium text-white'>
                Let's Discover Seattle
              </h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content relative'>
        <section className='flex flex-col w-full gap-4 mt-8'>
          <h1 className='m-0'>Recent Blog Posts</h1>
          <p>
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
          <main className={cn('flex h-full w-full flex-1 items-center justify-center py-20')}>
            <BeatLoader color='#ff0000' loading={true} size={15} />
          </main>
        </section>
      </article>
    </main>
  );
}
