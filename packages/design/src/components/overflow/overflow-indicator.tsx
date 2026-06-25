'use client';
// @refresh reset

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import * as React from 'react';

import type { OverflowInfo } from './types';

import { cn } from '../../lib/utils';
import { useOverflowContext, useOverflowRegistrationContext } from './context';
import { useStore } from './hooks';
import { selectHiddenCount, selectHiddenIds, selectIsOverflowing } from './utils/selectors';

// ─── Component name ───────────────────────────────────────────────────────────

const INDICATOR_NAME = 'OverflowIndicator';

// ─── OverflowIndicatorProps ───────────────────────────────────────────────────

export interface OverflowIndicatorProps extends Omit<useRender.ComponentProps<'div'>, 'children'> {
  /**
   * When false (default), the indicator element renders with
   * `position:absolute; visibility:hidden` when not overflowing so its size
   * can be measured for the size cache.
   *
   * When true, the indicator always renders fully — `data-visible=""` toggles
   * instead of mount/unmount. Use this to drive CSS transitions
   * (e.g. `opacity-0 → opacity-100`) without JS animation libraries.
   *
   * @default false
   */
  forceMount?: boolean;
  /**
   * Static ReactNode, or a render function receiving `OverflowInfo`.
   *
   * The render-function form gives access to `hiddenCount` and
   * `hiddenChildren` (the ReactNode subtrees of all currently-hidden items).
   *
   * @example static
   * <OverflowIndicator>
   *   <span>More items</span>
   * </OverflowIndicator>
   *
   * @example render function
   * <OverflowIndicator>
   *   {({ hiddenCount, hiddenChildren }) => (
   *     <MoreMenu count={hiddenCount} items={hiddenChildren} />
   *   )}
   * </OverflowIndicator>
   */
  children?: React.ReactNode | ((info: OverflowInfo) => React.ReactNode);
}

// ─── OverflowIndicator ────────────────────────────────────────────────────────

export function OverflowIndicator(props: OverflowIndicatorProps) {
  const { forceMount = false, className, ref, render, children, ...indicatorProps } = props;

  const overflowCtx = useOverflowContext(INDICATOR_NAME);
  const registrationCtx = useOverflowRegistrationContext(INDICATOR_NAME);

  const isOverflowing = useStore(selectIsOverflowing, overflowCtx.store);
  const hiddenCount = useStore(selectHiddenCount, overflowCtx.store);
  // Subscribed for reactivity only — when hiddenIds changes the indicator
  // re-renders, keeping the synchronous getHiddenNodes() call below fresh.
  useStore(selectHiddenIds, overflowCtx.store);

  const elRef = React.useRef<HTMLElement | null>(null);

  // Register so the measurement engine can read the indicator's rendered size.
  useIsoLayoutEffect(() => {
    registrationCtx.registerIndicator(elRef.current);
    return () => registrationCtx.registerIndicator(null);
  }, [registrationCtx]);

  const shouldRender = forceMount || isOverflowing;

  // When not overflowing and not forceMount, render with an absolute hidden
  // position so the element stays in the DOM for size measurement. This
  // allows the indicatorSizeCache to be pre-populated before the next
  // overflow transition.
  const hiddenMeasureStyle: React.CSSProperties | undefined = !shouldRender
    ? {
        position: 'absolute',
        visibility: 'hidden',
        pointerEvents: 'none',
      }
    : undefined;

  // Build `hiddenChildren` synchronously at render time — safe because the
  // indicator already re-renders whenever `hiddenIds` changes (via useStore
  // above). ReactNodes are intentionally not stored in the external store
  // to avoid spurious re-renders from non-comparable values.
  const info: OverflowInfo = {
    hiddenCount,
    hiddenChildren: registrationCtx.getHiddenNodes(),
    isOverflowing,
  };

  const resolvedChildren = typeof children === 'function' ? children(info) : children;

  const defaultProps: useRender.ElementProps<'div'> & {
    'data-slot': string;
    'data-visible'?: string;
  } = {
    'data-slot': 'overflow-indicator',
    'data-visible': isOverflowing ? '' : undefined,
    'aria-hidden': !shouldRender ? true : undefined,
    tabIndex: !shouldRender ? -1 : undefined,
    style: hiddenMeasureStyle,
    className: cn('shrink-0', className),
  };

  return useRender<Record<string, unknown>, HTMLElement>({
    defaultTagName: 'div',
    ref: [ref as React.Ref<HTMLDivElement>, elRef as React.Ref<HTMLDivElement>],
    render,
    props: mergeProps(
      { ...defaultProps, children: resolvedChildren } as Record<string, unknown>,
      indicatorProps as Record<string, unknown>,
    ),
  }) as React.ReactElement;
}

OverflowIndicator.displayName = 'OverflowIndicator';
