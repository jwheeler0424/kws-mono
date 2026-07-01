import type { TPropertyCard } from '@kws/types';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@kws/design/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import * as React from 'react';

import { cn } from '@/lib/utils';

import PropertyCard from './property-card';

export interface PropertyCarouselProps {
  /** Property listings to render as cards. */
  properties: TPropertyCard[];

  /** Enable autoplay. Default false. */
  autoplay?: boolean;
  /** Delay between autoplay transitions, in ms. Default 4000. */
  autoplayDelay?: number;
  /** Pause autoplay while the pointer is over the carousel. Default true. */
  pauseOnHover?: boolean;
  /** Resume autoplay after user interaction (drag/click). Default true. */
  stopOnInteraction?: boolean;

  /**
   * Transition speed, passed to Embla's `duration` option.
   * Lower = faster, higher = slower. Default 20 (Embla default is 25).
   */
  speed?: number;
  /** Loop back to the start when reaching the end. Default true. */
  loop?: boolean;

  className?: string;
  itemClassName?: string;
  title?: string;
}

export function PropertyCarousel({
  properties,
  autoplay = false,
  autoplayDelay = 4000,
  pauseOnHover = true,
  stopOnInteraction = true,
  speed = 20,
  loop = true,
  className,
  itemClassName,
  title,
}: PropertyCarouselProps) {
  const [_api, setApi] = React.useState<CarouselApi>();

  const plugins = React.useMemo(() => {
    if (!autoplay) return [];
    return [
      Autoplay({
        delay: autoplayDelay,
        stopOnInteraction,
        stopOnMouseEnter: pauseOnHover,
      }),
    ];
  }, [autoplay, autoplayDelay, stopOnInteraction, pauseOnHover]);

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>{title}</h2>
        </div>
      )}

      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
          loop,
          duration: speed,
        }}
        plugins={plugins}>
        <CarouselContent className=''>
          {properties.map((property) => (
            <CarouselItem key={property.listingKey} className={cn('', itemClassName)}>
              <PropertyCard listing={property} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='static shrink-0 translate-y-0' />

        <CarouselNext className='static shrink-0 translate-y-0' />
      </Carousel>
    </div>
  );
}

export default PropertyCarousel;
