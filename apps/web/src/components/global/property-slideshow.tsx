'use client';

import type { TMlsMedia } from '@kws/schema';

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@kws/design/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

export interface SlideshowProps extends React.PropsWithChildren {
  media: TMlsMedia[];
  className?: string;
  style?: React.CSSProperties;
  type?: 'fade' | 'slide' | 'zoom';
  autoplay?: boolean;
  autoPlaySpeed?: number;
  pauseOnHover?: boolean;
}

const divStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundSize: 'cover',
  height: '60vh',
  width: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
};

export function PropertySlideshow({
  media,
  className,
  style,
  type = 'slide',
  autoplay = true,
  autoPlaySpeed = 4000,
  pauseOnHover = true,
}: SlideshowProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  const scrollTo = (index: number) => api?.scrollTo(index);
  const setupSnaps = (emblaApi: CarouselApi) => setScrollSnaps(emblaApi!.scrollSnapList());

  React.useEffect(() => {
    if (!api) return;

    setupSnaps(api);
    api.on('reInit', setupSnaps);
  }, [api]);

  const plugins = React.useMemo(() => {
    if (!autoplay || media.length <= 1) return [];

    return [
      Autoplay({
        delay: autoPlaySpeed,
        playOnInit: true,
        stopOnMouseEnter: pauseOnHover,
      }),
    ];
  }, [autoplay, autoPlaySpeed, media.length, pauseOnHover]);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);

    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api]);

  if (type !== 'slide') return null;

  return (
    <div className={cn('slide-container property-slideshow', className)} style={style}>
      <Carousel
        opts={{
          align: 'start',
          loop: media.length > 1,
        }}
        plugins={plugins}
        setApi={setApi}
        className='h-full w-full relative'>
        <CarouselContent className='ml-0'>
          {media.map((img, index) => (
            <CarouselItem key={`${img.mediaURL}-${index}`} className='pl-0'>
              <div style={divStyle} className='property-slideshow-stage'>
                <img
                  src={img.mediaURL ?? ''}
                  alt={img.longDescription ?? `Image ${index + 1} of ${media.length}`}
                  height={img.imageHeight ?? 1920}
                  width={img.imageWidth ?? 1080}
                  className={cn('property-slideshow-image h-full w-auto bg-gray-700')}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding='async'
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {media.length > 1 ? (
          <>
            <button
              type='button'
              className='property-slideshow-arrow property-slideshow-arrow-prev'
              onClick={() => api?.scrollPrev()}
              disabled={!canScrollPrev}
              aria-label='Previous slide'>
              <ChevronLeftIcon className='h-5 w-5' />
            </button>
            <button
              type='button'
              className='property-slideshow-arrow property-slideshow-arrow-next'
              onClick={() => api?.scrollNext()}
              disabled={!canScrollNext}
              aria-label='Next slide'>
              <ChevronRightIcon className='h-5 w-5' />
            </button>

            <ul
              className='hidden md:flex absolute bottom-0 -translate-x-1/2 left-1/2 gap-2'
              aria-label='Slide indicators'>
              {scrollSnaps.map((_, index) => (
                <li key={`indicator-${index}`}>
                  <button
                    className={cn(
                      'cursor-pointer size-3 rounded-full border border-white/95 bg-black/50 transition-colors hover:bg-white/80',
                      index === selectedIndex && 'bg-polaris-primary',
                    )}
                    onClick={() => scrollTo(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === selectedIndex ? 'true' : undefined}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Carousel>
    </div>
  );
}

export default PropertySlideshow;
