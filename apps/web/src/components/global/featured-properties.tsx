import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';

import { featuredPropertiesOptions } from '@/features/mls/options';
import { cn } from '@/lib/utils';

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
  const { data: featuredProperties } = useSuspenseQuery(featuredPropertiesOptions());
  const visibleProperties = React.useMemo(
    () => featuredProperties?.slice(0, 12) ?? [],
    [featuredProperties],
  );

  return visibleProperties.length <= 0 ? (
    <div className='my-[clamp(3rem,10vw+1rem,5rem)] flex w-full items-center justify-center'>
      <span className='max-w-full rounded bg-black/60 p-[clamp(1rem,6vw+0.25rem,5rem)] text-center font-sans text-base font-thin text-white/75'>
        There are currently no available properties to view.
      </span>
    </div>
  ) : (
    <main
      {...props}
      className={cn(
        'relative mb-6 flex h-fit min-h-110 w-full items-center justify-center px-2 xs:w-full xs:p-[0_clamp(0rem,1.6vw+1.2rem,6rem)] md:mb-12! md:p-[0_clamp(1.25rem,1.65vw+2.16rem,6rem)] lg:p-0',
      )}>
      <PropertyCarousel autoplay={autoplay} speed={autoPlaySpeed} properties={visibleProperties} />
    </main>
  );
}
