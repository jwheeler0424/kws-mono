'use client';

import type { VariantProps } from 'class-variance-authority';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-admin-900 dark:transition-colors dark:duration-200 dark:ease-linear',
  {
    variants: {
      variant: {
        default: '',
        outlineWhite:
          'rounded-md border-2 border-white bg-transparent fill-white text-white no-underline underline-offset-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition-colors duration-200 ease-linear hover:bg-white hover:fill-polaris-primary hover:text-polaris-primary hover:no-underline hover:shadow-primary',
        solidWhite:
          'rounded-md border-2 border-white bg-white text-polaris-primary no-underline underline-offset-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition-colors duration-200 ease-linear hover:bg-transparent hover:text-white hover:no-underline hover:shadow-primary',
        outlineBlue:
          'rounded-md border-2 border-blue bg-transparent px-4 py-1 text-sm font-normal text-blue no-underline underline-offset-0 transition-colors duration-200 ease-linear hover:bg-blue hover:text-white hover:no-underline dark:border-highlight dark:text-highlight dark:hover:bg-highlight dark:hover:text-white',
        solidBlue:
          'rounded-md border-2 border-blue bg-blue text-sm font-normal text-white no-underline underline-offset-0 transition-colors duration-200 ease-linear hover:bg-blue-600 hover:text-white hover:no-underline',
        outlinePrimary:
          'rounded-md border-2 border-polaris-primary bg-transparent text-polaris-primary no-underline underline-offset-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition-colors duration-200 ease-linear hover:bg-polaris-primary hover:text-white hover:no-underline hover:shadow',
        solidPrimary:
          'rounded-md border-2 border-polaris-primary bg-polaris-primary text-white no-underline underline-offset-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition-colors duration-200 ease-linear hover:border-polaris-primary-600 hover:bg-polaris-primary-700 hover:text-white hover:no-underline hover:shadow-primary',
        outlineRed:
          'rounded-md border-2 border-red-600 bg-transparent text-red-600 no-underline underline-offset-0 drop-shadow-none transition-colors duration-200 ease-linear hover:bg-red-600 hover:text-white hover:no-underline hover:shadow focus-visible:ring-red-600',
        solidRed:
          'rounded-md border-2 border-red bg-red text-white no-underline underline-offset-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition-colors duration-200 ease-linear hover:border-red-600 hover:bg-primary-600 hover:text-white hover:no-underline hover:shadow-primary',
        outlineAdmin:
          'rounded-md border-2 border-admin bg-transparent text-sm font-normal text-admin no-underline underline-offset-0 transition-colors duration-200 ease-linear hover:bg-admin hover:text-white hover:no-underline',
        solidAdmin:
          'rounded-md border-2 border-admin bg-admin text-sm font-normal text-white shadow shadow-admin-900/50 transition-colors duration-200 ease-linear hover:bg-admin-700 dark:bg-blue dark:hover:bg-blue-600',
        outlineIcon:
          'rounded-md border-2 border-icon bg-transparent text-sm font-normal text-icon no-underline underline-offset-0 transition-colors duration-200 ease-linear hover:bg-icon hover:text-white hover:no-underline',
        solidIcon:
          'rounded-md border-2 border-icon bg-icon text-sm font-normal text-white no-underline underline-offset-0 transition-colors duration-200 ease-linear hover:bg-icon-600 hover:text-white hover:no-underline',
        outlineGreen:
          'rounded-md border-2 border-green-600 bg-transparent text-sm font-normal text-green-600 no-underline underline-offset-0 transition-colors duration-200 ease-linear hover:bg-green-600 hover:text-white hover:no-underline',
        solidGreen:
          'rounded-md border-2 border-green-600 bg-green-600 text-sm font-normal text-white no-underline underline-offset-0 transition-colors duration-200 ease-linear hover:bg-green-700 hover:text-white hover:no-underline',
        ghost:
          'text-highlight hover:bg-icon-100/35 focus-visible:ring-highlight dark:hover:bg-admin-900',
        slide: 'border border-solid border-gray/50 bg-black/50',
        link: 'text-current underline-offset-4 hover:underline',
      },
      chroma: {
        default: '',
        admin: 'text-admin hover:text-admin-400 dark:hover:text-admin-700',
        blue: 'text-highlight hover:text-blue dark:hover:text-blue',
        white: 'text-white',
        primary: 'text-polaris-primary',
        gray: 'text-gray-700',
      },
      size: {
        default: '',
        sm: 'rounded-md px-3 py-1',
        md: 'rounded-md px-4 py-2',
        lg: 'rounded-md px-8 py-3',
        icon: 'rounded-md p-2',
        slide: 'size-8 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      chroma: 'default',
      size: 'default',
    },
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
