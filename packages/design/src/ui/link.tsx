'use client';
import type { VariantProps } from 'class-variance-authority';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@/lib/utils';

import { buttonVariants } from './button';

const linkVariants = buttonVariants;

// ── Internal router link ────────────────────────────────────────────────────
function Link({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: useRender.ComponentProps<'a'> & VariantProps<typeof linkVariants>) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: cn(linkVariants({ variant, size, className })),
      },
      props,
    ),
    render,
    state: {
      slot: 'link',
      variant,
      size,
    },
  });
}

export { Link, linkVariants };
