'use client';

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@/lib/utils';

function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot='scroll-area'
      className={cn('relative', className)}
      {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot='scroll-area-viewport'
        className='size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1'>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot='scroll-area-scrollbar'
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'flex touch-none p-1 transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-horizontal:px-1 data-vertical:h-full data-vertical:w-3.5 data-vertical:border-l data-vertical:border-l-transparent data-vertical:py-3 data-vertical:pt-1',
        className,
      )}
      {...props}>
      <ScrollAreaPrimitive.Thumb
        data-slot='scroll-area-thumb'
        className='relative flex-1 rounded-full bg-polaris-primary'
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
