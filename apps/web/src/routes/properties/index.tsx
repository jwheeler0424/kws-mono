import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation/parallax';
import PropertiesSection from '@/components/global/properties-section';
import {
  availablePropertiesOptions,
  pendingPropertiesOptions,
  soldPropertiesOptions,
} from '@/features/mls/options';
import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/properties/')({
  loader: ({ context }) => {
    void Promise.all([
      context.queryClient.ensureQueryData(availablePropertiesOptions()),
      context.queryClient.ensureQueryData(pendingPropertiesOptions()),
      context.queryClient.ensureQueryData(soldPropertiesOptions()),
    ]);
    return {
      siteConfig: context.siteConfig,
    };
  },
  head: ({ loaderData }) => {
    const { seo } = useSeo(loaderData!.siteConfig);
    return {
      meta: [
        ...seo({
          title: 'Recently Listed Properties',
          description:
            'Discover all of the latest market updates and the best places to eat in Seattle.',
          keywords: [
            'properties',
            'buying',
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
  const { data: available } = useSuspenseQuery(availablePropertiesOptions());
  const { data: pending } = useSuspenseQuery(pendingPropertiesOptions());
  const { data: sold } = useSuspenseQuery(soldPropertiesOptions());

  return (
    <main className='w-full'>
      {/* Hero */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            className='h-full w-full object-cover object-top'
            src='/assets/images/our-properties-page.jpg'
            alt='Our Properties Banner - Incredible View'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer range={75} speed={0.68}>
          <article className='banner banner-title flex'>
            <main className='relative top-[clamp(15vh,calc(10vh-4rem),25vh)] px-0 py-[clamp(1.25rem,1.65vw-2.16rem,6rem)]'>
              <h1 className='relative w-full text-left text-7xl font-medium text-white'>
                Our Properties
              </h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content relative'>
        <PropertiesSection
          title='Available Properties'
          properties={available ?? []}
          emptyText='There are currently no available properties to view.'
        />
        <PropertiesSection
          title='Pending Properties'
          properties={pending ?? []}
          emptyText='There are currently no pending properties to view.'
        />
        <PropertiesSection
          title='Recently Sold Properties'
          properties={sold ?? []}
          emptyText='There are currently no recently sold properties to view.'
        />
      </article>
    </main>
  );
}
