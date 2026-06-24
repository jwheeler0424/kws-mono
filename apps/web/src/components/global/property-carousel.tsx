import Autoplay from 'embla-carousel-autoplay';
import React from 'react';

import type { TPropertyCard } from '@/types/property';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

import PropertyCard from './property-card';

export interface PropertyCarouselProps extends React.ComponentPropsWithoutRef<'div'> {
  autoplay?: boolean;
  autoPlaySpeed?: number;
  id?: string;
  properties: TPropertyCard[];
}

export function PropertyCarousel({
  className,
  autoplay = false,
  autoPlaySpeed = 4000,
  properties,
}: PropertyCarouselProps) {
  const plugin = React.useRef(
    Autoplay({
      delay: autoPlaySpeed,
      playOnInit: false,
      stopOnMouseEnter: true,
    }),
  );

  return (
    <div
      className={cn(
        'mx-16 h-fit w-10/12 min-w-60 2xstb:mx-8 2xltb:mx-10 2xltb:w-full smdt:mx-14 mddt:mx-20',
        className,
      )}>
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        plugins={[plugin.current]}
        className='w-full'
        onLoad={() => {
          if (autoplay) plugin.current.play();
        }}>
        <CarouselContent className={cn('-ml-6 2xltb:-ml-10 xsdt:ml-0 smdt:-ml-16')}>
          {properties.map((property, index) => (
            <CarouselItem
              key={`${property.listingId}-${index}`}
              className={cn(
                'flex items-center justify-center pl-6 smtb:basis-1/2 2xltb:basis-1/3 2xltb:pl-10 xsdt:pl-0 smdt:basis-1/4 smdt:pl-16 xldt:basis-1/5',
              )}>
              <div className='p-1'>
                <PropertyCard listing={property} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className={cn(
            '-left-11 mdmb:-left-12 xlmb:-left-14 xstb:-left-6 smtb:-left-14 xsdt:-left-10 smdt:-left-14 mddt:-left-20',
          )}
        />
        <CarouselNext
          className={cn(
            '-right-11 mdmb:-right-12 xlmb:-right-14 xstb:-right-6 smtb:-right-14 xsdt:-right-10 smdt:-right-14 mddt:-right-20',
          )}
        />
      </Carousel>
    </div>
  );
}

export default PropertyCarousel;
