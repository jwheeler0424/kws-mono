import React, { type ElementType } from 'react';

import { cn } from '@/lib/utils';

import { ParallaxItem } from './parallax-item';

type ParallaxContentLayerProps<T extends ElementType> = {
  speed?: number;
  range?: number;
  direction?: 'x' | 'y';
  className?: string;
} & Omit<
  React.ComponentPropsWithoutRef<typeof ParallaxItem<T>>,
  'speed' | 'range' | 'direction' | 'className'
>;

export const ParallaxContentLayer = <T extends ElementType = 'div'>({
  speed = 0.6,
  range = 56,
  direction = 'y',
  className,
  render,
  ...rest
}: ParallaxContentLayerProps<T>) => {
  return (
    <ParallaxItem
      render={render}
      speed={speed}
      range={range}
      direction={direction}
      className={cn('absolute inset-0 z-10', className)}
      {...rest}
    />
  );
};
