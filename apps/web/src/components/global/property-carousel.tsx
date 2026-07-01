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

const CARD_WIDTH_CLASSES = [
  // Fallback for containers narrower than one min-width card.
  'basis-[clamp(280px,100cqi,320px)]',
  '@min-[576px]:basis-[clamp(280px,calc((100cqi_-_16px)/2),320px)]',
  '@min-[872px]:basis-[clamp(280px,calc((100cqi_-_32px)/3),320px)]',
  '@min-[1168px]:basis-[clamp(280px,calc((100cqi_-_48px)/4),320px)]',
  '@min-[1464px]:basis-[clamp(280px,calc((100cqi_-_64px)/5),320px)]',
  '@min-[1760px]:basis-[clamp(280px,calc((100cqi_-_80px)/6),320px)]',
  '@min-[2056px]:basis-[clamp(280px,calc((100cqi_-_96px)/7),320px)]',
  '@min-[2352px]:basis-[clamp(280px,calc((100cqi_-_112px)/8),320px)]',
] as const;

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
          containScroll: 'trimSnaps',
          // Every CarouselItem is its own Embla snap point regardless of how
          // many are visible at once, so autoplay's scrollNext() and the
          // prev/next buttons already advance one card at a time. Setting
          // this explicitly just locks that in rather than relying on the
          // implicit default, so it survives future Embla option changes.
          slidesToScroll: 1,
        }}
        plugins={plugins}
        className='w-full'>
        {/* Prev/next live in a flex row alongside the card viewport, not
            absolutely-positioned over it — so they sit fully outside the box
            the cards scroll within, rather than overlapping its edges. */}
        <div className='flex items-center gap-3'>
          <CarouselPrevious className='static shrink-0 translate-y-0' />

          {/* `@container` (Tailwind's container-type: inline-size utility)
              establishes the query context that CARD_WIDTH_CLASSES read
              from. It's unnamed, so it just scopes to this DOM subtree — no
              id/name bookkeeping needed even with multiple carousels on one
              page. Only the card viewport is measured, not the buttons. */}
          <div className='@container w-full min-w-0 flex-1'>
            <CarouselContent>
              {properties.map((property) => (
                <CarouselItem
                  key={property.listingKey}
                  className={cn(
                    'shrink-0 grow-0 max-w-[320px]',
                    ...CARD_WIDTH_CLASSES,
                    itemClassName,
                  )}>
                  <PropertyCard listing={property} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </div>

          <CarouselNext className='static shrink-0 translate-y-0' />
        </div>
      </Carousel>
    </div>
  );
}

export default PropertyCarousel;
