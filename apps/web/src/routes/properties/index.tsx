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
          title: 'Our Exclusive Listings',
          description:
            'Explore available, pending and recently sold Seattle properties with Kyle Weber at Compass and Hopper Group.',
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
      <ParallaxContainer className='banner-short relative flex items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            className='h-full w-full object-cover'
            src='/assets/images/compass/properties.webp'
            alt='Downtown Seattle towers'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article className='banner banner-title flex'>
            <main className='py-12'>
              <h1>Our Exclusive Listings</h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content relative'>
        <div className='flex justify-center border-b border-neutral-200 py-8'>
          <img
            src='/assets/brand/hopper-group-black.png'
            alt='Hopper Group'
            className='h-28 w-auto max-w-full object-contain sm:h-36'
            loading='lazy'
          />
        </div>
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
