'use client';

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import React from 'react';

import { cn } from '@/lib/utils';

function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const hasParallaxScroller = 'data-parallax-scroller' in props;

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;

    const viewport = root.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']");
    if (!viewport) return;

    let raf = 0;

    const checkUnderThumb = () => {
      raf = 0;
      const { scrollTop, scrollHeight, clientHeight } = viewport;

      if (scrollHeight <= clientHeight) {
        root.style.setProperty(
          '--thumb-white-mask',
          'linear-gradient(to bottom, transparent, transparent)',
        );
        return;
      }

      // Compute the thumb's actual bounding rect in browser coordinates.
      // Base UI positions the thumb inside the scrollbar track which lives in Root.
      const rootRect = root.getBoundingClientRect();
      const thumbHeight = (clientHeight / scrollHeight) * clientHeight;
      const thumbTopInTrack = (scrollTop / scrollHeight) * clientHeight;
      const thumbTopY = rootRect.top + thumbTopInTrack;
      const thumbBottomY = thumbTopY + thumbHeight;

      const redEls = viewport.querySelectorAll<HTMLElement>('[data-red-bg]');
      const segments: Array<{ start: number; end: number }> = [];

      for (const el of redEls) {
        const elRect = el.getBoundingClientRect();
        // Overlap between element and thumb in browser-Y space
        const overlapTop = Math.max(elRect.top, thumbTopY);
        const overlapBottom = Math.min(elRect.bottom, thumbBottomY);
        if (overlapBottom <= overlapTop) continue;
        // Convert overlap to thumb-local px (0 = top of thumb, thumbHeight = bottom)
        const startPx = overlapTop - thumbTopY;
        const endPx = overlapBottom - thumbTopY;
        segments.push({ start: startPx, end: endPx });
      }

      if (segments.length === 0) {
        root.style.setProperty(
          '--thumb-white-mask',
          'linear-gradient(to bottom, transparent, transparent)',
        );
        return;
      }

      segments.sort((a, b) => a.start - b.start);

      const w = 'white';
      const stops: string[] = [];

      stops.push('transparent 0px');

      for (const seg of segments) {
        stops.push(`transparent ${seg.start}px`, `${w} ${seg.start}px`);
        stops.push(`${w} ${seg.end}px`, `transparent ${seg.end}px`);
      }

      stops.push('transparent 100%');

      root.style.setProperty(
        '--thumb-white-mask',
        `linear-gradient(to bottom, ${stops.join(', ')})`,
      );
    };

    const queue = () => {
      if (!raf) raf = window.requestAnimationFrame(checkUnderThumb);
    };

    viewport.addEventListener('scroll', queue, { passive: true });
    queue();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      viewport.removeEventListener('scroll', queue);
    };
  }, []);

  return (
    <ScrollAreaPrimitive.Root
      data-slot='scroll-area'
      ref={rootRef}
      className={cn('relative', className)}
      {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot='scroll-area-viewport'
        className='size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1'>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar
        thumbClassName={hasParallaxScroller ? 'bg-polaris-primary' : undefined}
        thumbStyle={
          hasParallaxScroller
            ? {
                backgroundImage:
                  'var(--thumb-white-mask, linear-gradient(to bottom, white, white)), linear-gradient(to bottom, var(--color-polaris-primary), var(--color-polaris-primary))',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100%, 100% 100%',
                backgroundPosition: '0 0, 0 0',
                translate: '0 0',
              }
            : undefined
        }
      />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  thumbClassName,
  thumbStyle,
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props & {
  thumbClassName?: string;
  thumbStyle?: React.CSSProperties;
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot='scroll-area-scrollbar'
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'flex touch-none p-0.5 transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-3.25 data-vertical:border-y data-vertical:border-l data-vertical:border-y-transparent data-vertical:border-l-transparent data-vertical:px-0.75 data-vertical:pt-0.5 data-vertical:pb-0.5 z-50',
        className,
      )}
      {...props}>
      <ScrollAreaPrimitive.Thumb
        data-slot='scroll-area-thumb'
        className={cn(
          'relative flex-1 -translate-x-px rounded-full transition-none',
          thumbClassName,
        )}
        style={thumbStyle}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
