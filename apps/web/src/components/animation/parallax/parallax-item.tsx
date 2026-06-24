import React, { type ElementType } from 'react';

type ParallaxItemProps<T extends ElementType> = {
  speed: number;
  direction?: 'y' | 'x';
  range?: number;
  children?: React.ReactNode;
} & React.ComponentProps<T>;

export const ParallaxItem = <T extends ElementType = 'div'>({
  speed,
  direction = 'y',
  range = 24,
  className,
  ...rest
}: ParallaxItemProps<T>) => {
  return (
    <div
      className={className}
      data-slot='parallax-item'
      data-parallax-speed={speed}
      data-parallax-direction={direction}
      data-parallax-range={range}
      {...rest}
    />
  );
};
