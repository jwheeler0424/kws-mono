import type { TPropertyCard } from '@kws/schema';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@kws/design/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';
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
        playOnInit: true,
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
        }}
        orientation='horizontal'
        plugins={plugins}
        className='w-full xstb:px-8 md:px-0 2xsdt:px-4 xsdt:px-14 lgdt:px-2 4xldt:px-0'>
        <CarouselContent className='-ml-8 md:-ml-2 lgtb:-ml-4'>
          {properties.map((property) => (
            <CarouselItem
              key={property.listingKey}
              className={cn(
                'pl-8 basis-full flex justify-center md:pl-2 md:basis-1/2 lgtb:pl-4 lg:basis-1/3 lgdt:basis-1/4 4xldt:basis-1/5 6xldt:basis-1/6',
                itemClassName,
              )}>
              <PropertyCard listing={property} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className='-left-5 bg-white/80 text-polaris-primary hover:bg-polaris-primary hover:text-white border-white transition-colors duration-300 2xlmb:bg-transparent 2xlmb:text-white 2xlmb:border-2 2xlmb:border-white 2xlmb:hover:bg-white 2xlmb:hover:text-polaris-primary 2xlmb:-left-10 xstb:-left-5 md:-left-12 lgtb:-left-14 2xsdt:-left-10 xsdt:left-0 lgdt:-left-12 4xldt:-left-14'
          render={
            <Button size='icon'>
              <ChevronLeftIcon className='-ml-0.5' />
            </Button>
          }
        />
        <CarouselNext
          className='-right-5 bg-white/80 text-polaris-primary hover:bg-polaris-primary hover:text-white border-white transition-colors duration-300 2xlmb:bg-transparent 2xlmb:text-white 2xlmb:border-2 2xlmb:border-white 2xlmb:hover:bg-white 2xlmb:hover:text-polaris-primary 2xlmb:-right-10 xstb:-right-5 md:-right-12 lgtb:-right-14 2xsdt:-right-10 xsdt:right-0 lgdt:-right-12 4xldt:-right-14'
          render={
            <Button size='icon'>
              <ChevronRightIcon className='-mr-0.5' />
            </Button>
          }
        />
      </Carousel>
    </div>
  );
}

export default PropertyCarousel;
