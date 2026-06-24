'use client';

import type { ComponentProps } from 'react';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot='tabs'
      orientation={orientation}
      className={cn(
        'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row',
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list flex w-fit h-fit items-center justify-center rounded-lg p-0.75 text-muted-foreground group-data-[orientation=horizontal]/tabs:gap-0.75 group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=horizontal]/tabs:data-[variant=line]:gap-0 data-[variant=line]:rounded-none data-[variant=line]:px-0',
  {
    variants: {
      variant: {
        default: 'bg-card',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot='tabs-trigger'
      className={cn(
        "relative inline-flex h-auto items-center justify-center gap-2 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=horizontal]/tabs:h-auto group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:py-1.5 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pl-3.25 has-data-[icon=inline-start]:pr-3.25 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_span]:pt-0.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground',
        'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:-inset-x-px group-data-[orientation=horizontal]/tabs:after:-bottom-1.25 group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[orientation=vertical]/tabs:after:rounded-full hover:group-data-[variant=line]/tabs-list:after:opacity-100 group-data-[variant=line]/tabs-list:data-active:after:opacity-100 hover:group-data-[variant=line]/tabs-list:data-active:after:bg-foreground',
        className,
      )}
      {...props}
    />
  );
}

function TabsIndicator({ className, ...props }: ComponentProps<typeof TabsPrimitive.Indicator>) {
  return (
    <TabsPrimitive.Indicator
      data-slot='tabs-indicator'
      className={cn(
        'data-[orientation=horizontal]/tabs:bottom-0 data-[orientation=horizontal]/tabs:h-0.5 data-[orientation=vertical]/tabs:right-0 data-[orientation=vertical]/tabs:w-0.5 absolute bg-foreground/50',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot='tabs-content'
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsIndicator, TabsList, tabsListVariants, TabsTrigger };

