'use client';

import type { VariantProps } from 'class-variance-authority';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const solidButton =
  'border-black bg-black text-white hover:border-[#242424] hover:bg-[#242424] hover:text-white';
const outlineButton = 'border-black bg-transparent text-black hover:bg-black hover:text-white';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-solid font-sans text-base leading-[1.3] font-medium tracking-normal whitespace-nowrap no-underline shadow-none ring-offset-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: solidButton,
        outlineWhite:
          'border-white bg-transparent text-white hover:bg-white hover:text-black focus-visible:ring-white',
        solidWhite: 'border-white bg-white text-black hover:opacity-80 focus-visible:ring-white',
        outlineBlue: outlineButton,
        solidBlue: solidButton,
        outlinePrimary: outlineButton,
        solidPrimary: solidButton,
        outlineRed:
          'border-red-600 bg-transparent text-red-600 hover:bg-red-600 hover:text-white focus-visible:ring-red-600',
        solidRed:
          'border-red-600 bg-red-600 text-white hover:bg-red-700 hover:text-white focus-visible:ring-red-600',
        outlineAdmin: outlineButton,
        solidAdmin: solidButton,
        outlineIcon: outlineButton,
        solidIcon: solidButton,
        outlineGreen: outlineButton,
        solidGreen: solidButton,
        ghost: 'border-transparent bg-transparent text-neutral-900 hover:bg-neutral-100',
        slide: 'border-white/50 bg-black/50 text-white hover:bg-black/70',
        link: 'border-transparent bg-transparent text-current underline-offset-4 hover:underline',
      },
      chroma: {
        default: '',
        admin: 'text-neutral-900 hover:text-neutral-600',
        blue: 'text-neutral-900 hover:text-neutral-600',
        white: 'text-white',
        primary: 'text-polaris-primary',
        gray: 'text-gray-700',
      },
      size: {
        default: 'px-6 pt-[calc(0.75rem+0.125em)] pb-[calc(0.75rem-0.125em)]',
        sm: 'min-h-9 px-4 pt-[calc(0.5rem+0.125em)] pb-[calc(0.5rem-0.125em)] text-sm',
        md: 'px-6 pt-[calc(0.75rem+0.125em)] pb-[calc(0.75rem-0.125em)]',
        lg: 'px-6 pt-[calc(0.75rem+0.125em)] pb-[calc(0.75rem-0.125em)] text-lg leading-normal',
        icon: 'size-10 p-0',
        slide: 'size-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      chroma: 'default',
      size: 'default',
    },
    compoundVariants: [{ variant: 'link', size: 'default', className: 'min-h-0 border-0 p-0' }],
  },
);

function Button({
  className,
  variant,
  chroma,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot='button'
      className={cn(buttonVariants({ variant, chroma, size }), className)}
      {...props}
    />
  );
}
export { Button, buttonVariants };
