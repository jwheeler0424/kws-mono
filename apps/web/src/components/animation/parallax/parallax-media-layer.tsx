import React, { Activity, type ElementType } from 'react';

import { cn } from '@/lib/utils';

import { ParallaxItem } from './parallax-item';

type ParallaxMediaLayerProps<T extends ElementType> = {
  render?: T;
  speed?: number;
  range?: number;
  direction?: 'x' | 'y';
  overlay?: boolean;
  overlayOpacity?: number;
  className?: string;
} & Omit<
  React.ComponentPropsWithoutRef<typeof ParallaxItem<T>>,
  'speed' | 'range' | 'direction' | 'className'
>;

export const ParallaxMediaLayer = <T extends ElementType = 'div'>({
  speed = 0.6,
  range = 48,
  direction = 'y',
  overlay,
  overlayOpacity = 50,
  children,
  className,
  ...rest
}: ParallaxMediaLayerProps<T>) => {
  return (
    <ParallaxItem
      speed={speed}
      range={range}
      direction={direction}
      className={cn('pointer-events-none absolute inset-0', className)}
      {...rest}>
      {children}
      <Activity mode={overlay ? 'visible' : 'hidden'}>
        <div
          data-slot='parallax-overlay'
          className={`bg-black/${overlayOpacity} absolute inset-0 isolate`}
        />
      </Activity>
    </ParallaxItem>
  );
};
