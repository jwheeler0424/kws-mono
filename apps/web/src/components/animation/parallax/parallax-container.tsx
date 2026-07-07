'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React, { useRef } from 'react';

import { ensureGsapRegistered } from '@/lib/tools/gsap';

interface ParallaxContainerProps {
  children: React.ReactNode;
  className?: string;
  scrub?: boolean | number;
  start?: string;
  end?: string;
}

let refreshRaf = 0;

ensureGsapRegistered();

const scheduleScrollTriggerRefresh = () => {
  if (typeof window === 'undefined' || refreshRaf) return;

  refreshRaf = window.requestAnimationFrame(() => {
    refreshRaf = 0;
    ScrollTrigger.refresh();
  });
};

const getScrollParent = (element: HTMLElement | null): HTMLElement | Window => {
  if (!element || typeof window === 'undefined') return window;

  const isScrollable = (node: HTMLElement): boolean => {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    return (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight
    );
  };

  const taggedScroller = element.closest<HTMLElement>('[data-parallax-scroller]');
  if (taggedScroller) {
    if (isScrollable(taggedScroller)) return taggedScroller;

    const taggedViewport = taggedScroller.querySelector<HTMLElement>(
      "[data-slot='scroll-area-viewport']",
    );
    if (taggedViewport && isScrollable(taggedViewport)) return taggedViewport;
  }

  let parent = element.parentElement;
  while (parent) {
    const canScroll = isScrollable(parent);

    if (canScroll) return parent;
    parent = parent.parentElement;
  }

  return window;
};

export const ParallaxContainer = ({
  children,
  className,
  scrub = true,
  start = 'top bottom',
  end = 'bottom top',
}: ParallaxContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container || typeof window === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const scroller = getScrollParent(container);
      const parallaxElements = gsap.utils.toArray<HTMLElement>('[data-parallax-speed]', container);

      parallaxElements.forEach((el) => {
        const speed = Number(el.dataset.parallaxSpeed ?? 0);
        if (!Number.isFinite(speed) || speed === 0) return;

        const direction = el.dataset.parallaxDirection === 'x' ? 'x' : 'y';
        const range = Number(el.dataset.parallaxRange ?? 40);

        gsap.set(el, { willChange: 'transform', force3D: true });

        if (direction === 'x') {
          const getDistance = () => container.clientWidth * (range / 100) * speed;

          gsap.fromTo(
            el,
            { x: () => -getDistance() },
            {
              x: () => getDistance(),
              ease: 'none',
              scrollTrigger: {
                trigger: container,
                scroller,
                start,
                end,
                scrub,
                invalidateOnRefresh: true,
              },
            },
          );

          return;
        }

        const yDistance = range * speed;
        gsap.fromTo(
          el,
          { yPercent: -yDistance },
          {
            yPercent: yDistance,
            ease: 'none',
            scrollTrigger: {
              trigger: container,
              scroller,
              start,
              end,
              scrub,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      scheduleScrollTriggerRefresh();
    },
    {
      dependencies: [scrub, start, end],
      scope: containerRef,
      revertOnUpdate: true,
    },
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};
