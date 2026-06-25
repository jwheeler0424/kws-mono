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

    const redEls = Array.from(viewport.querySelectorAll<HTMLElement>('[data-red-bg]'));
    if (redEls.length === 0) {
      root.style.setProperty(
        '--thumb-white-mask',
        'linear-gradient(to bottom, transparent, transparent)',
      );
      return;
    }

    let raf = 0;
    let measureRaf = 0;
    let redRanges: Array<{ start: number; end: number }> = [];

    const measureRedRanges = () => {
      const viewportRect = viewport.getBoundingClientRect();
      const baseScrollTop = viewport.scrollTop;

      redRanges = redEls
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const start = rect.top - viewportRect.top + baseScrollTop;
          const end = rect.bottom - viewportRect.top + baseScrollTop;
          return { start, end };
        })
        .filter((segment) => Number.isFinite(segment.start) && segment.end > segment.start);
    };

    const queueMeasure = () => {
      if (measureRaf) return;
      measureRaf = window.requestAnimationFrame(() => {
        measureRaf = 0;
        measureRedRanges();
        queue();
      });
    };

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

      const thumbHeight = (clientHeight / scrollHeight) * clientHeight;
      const thumbTopInTrack = (scrollTop / scrollHeight) * clientHeight;
      const thumbTop = thumbTopInTrack;
      const thumbBottom = thumbTop + thumbHeight;

      const segments: Array<{ start: number; end: number }> = [];

      for (const range of redRanges) {
        // Convert content scroll-space into viewport local-space.
        const rangeTop = range.start - scrollTop;
        const rangeBottom = range.end - scrollTop;
        const overlapTop = Math.max(rangeTop, thumbTop);
        const overlapBottom = Math.min(rangeBottom, thumbBottom);
        if (overlapBottom <= overlapTop) continue;

        // Convert overlap to thumb-local px (0 = top of thumb, thumbHeight = bottom)
        const startPx = overlapTop - thumbTop;
        const endPx = overlapBottom - thumbTop;
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

    measureRedRanges();
    viewport.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queueMeasure);
    queue();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      if (measureRaf) window.cancelAnimationFrame(measureRaf);
      viewport.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queueMeasure);
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
