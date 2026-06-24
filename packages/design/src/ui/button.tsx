'use client';

import type { VariantProps } from 'class-variance-authority';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-chart-2/75 dark:hover:bg-chart-2 transition-colors',
        outline:
          'border-border bg-card hover:bg-accent hover:text-foreground dark:bg-card dark:border-border/50 dark:hover:bg-muted/20 aria-expanded:bg-muted dark:aria-expanded:bg-card aria-expanded:text-foreground shadow-xs',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'bg-transparent hover:bg-muted hover:text-foreground dark:hover:bg-muted/60 aria-expanded:bg-muted aria-expanded:text-foreground',
        muted:
          'text-muted-foreground hover:bg-secondary hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted dark:aria-expanded:bg-muted/50 aria-expanded:text-foreground',
        destructive:
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'ghost-destructive':
          'bg-transparent hover:bg-destructive/10 focus-visible:ring-destructive/10 dark:focus-visible:ring-destructive/20 dark:bg-transparent text-destructive/90 hover:text-destructive dark:hover:text-destructive focus-visible:border-destructive/20 dark:hover:bg-destructive/15',
        link: 'text-foreground font-medium underline-offset-4 hover:underline',
        'link-animated': 'text-foreground font-medium',
      },
      size: {
        default:
          'h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        inline: 'animated-underline hover:animated-underline-hover',
        icon: 'size-9 border-none',
        'icon-xs':
          "size-7 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3 border-none",
        'icon-sm':
          'size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md border-none',
        'icon-lg': 'size-10 border-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
    compoundVariants: [
      {
        variant: 'link-animated',
        size: 'default',
        className:
          'h-auto w-fit px-1 gap-1.5 -translate-x-1 animated-underline-from-left hover:animated-underline-hover',
      },
    ],
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
