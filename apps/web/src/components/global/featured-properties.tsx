import { useSuspenseQuery } from '@tanstack/react-query';
// import { getFeaturedProperties } from "@/services/api/properties/queries/featured-properties";
import React from 'react';

import { cn } from '@/lib/utils';
import { featuredPropertyCardsPageOptions } from '@/packages/mls/options/properties.options';

import PropertyCarousel from './property-carousel';

export interface FeaturedPropertiesProps extends React.ComponentPropsWithoutRef<'div'> {
  autoplay?: boolean;
  autoPlaySpeed?: number;
  id?: string;
}

export default function FeaturedProperties({
  autoplay = false,
  autoPlaySpeed = 4000,
  ...props
}: FeaturedPropertiesProps) {
  const { data: featuredProperties } = useSuspenseQuery(featuredPropertyCardsPageOptions());

  return !featuredProperties.items || featuredProperties.items.length <= 0 ? (
    <div className='my-[clamp(3rem,10vw+1rem,5rem)] flex w-full items-center justify-center'>
      <span className='max-w-full rounded bg-black/60 p-[clamp(1rem,6vw+0.25rem,5rem)] text-center font-sans text-base font-thin text-white/75'>
        There are currently no available properties to view.
      </span>
    </div>
  ) : (
    <main
      {...props}
      className={cn(
        'relative mb-6 flex h-fit min-h-110 w-10/12 items-center justify-center xs:w-full xs:p-[0_clamp(0rem,1.6vw+1.2rem,6rem)] md:mb-12! md:p-[0_clamp(1.25rem,1.65vw+2.16rem,6rem)] lg:p-0',
      )}>
      <PropertyCarousel
        autoplay={autoplay}
        autoPlaySpeed={autoPlaySpeed}
        properties={featuredProperties.items}
      />
    </main>
  );
}
