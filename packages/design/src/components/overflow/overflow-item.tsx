'use client';
// @refresh reset

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import * as React from 'react';

import { cn } from '../../lib/utils';
import {
  OverflowItemContext,
  useOverflowContext,
  useOverflowRegistrationContext,
  type OverflowItemContextValue,
} from './context';
import { useStore } from './hooks';
import { selectorHiddenId, selectorOverscanId } from './utils/selectors';

// ─── Component name ───────────────────────────────────────────────────────────

const ITEM_NAME = 'OverflowItem';

// ─── OverflowItemProps ────────────────────────────────────────────────────────

export interface OverflowItemProps extends useRender.ComponentProps<'div'> {
  /**
   * When true (default), hidden items stay in the DOM with:
   *   `data-hidden=""`  — CSS selector hook
   *   `aria-hidden`     — screen reader suppression
   *   `tabIndex=-1`     — keyboard navigation suppression
   *
   * Two hidden-mount modes are used depending on overscan membership:
   *   • **Zero-footprint** (default hidden): `position:absolute; width:0; height:0;
   *     overflow:hidden; visibility:hidden` — preserves React subtree state
   *     without contributing to scroll extents or page-width expansion.
   *   • **Warm-hidden** (in overscan window): `position:absolute; visibility:hidden;
   *     contain:layout paint style` — fully rendered off-screen, ready for
   *     instant reveal on resize without a tree remount.
   *
   * When false, hidden items outside the overscan window drop their subtree.
   * A lightweight wrapper stays mounted so the registry preserves document
   * order and cached size dimensions.
   */
  keepMounted?: boolean;
  /**
   * ## reserved ## Priority-based overflow eviction — planned for a future release.
   * Higher-priority items are kept visible longer when space is tight.
   * ## defaultValue ## undefined
   */
  priority?: number;
}

// ─── OverflowItem ─────────────────────────────────────────────────────────────

export function OverflowItem(props: OverflowItemProps) {
  const {
    keepMounted = true,
    priority: _priority, // reserved, not yet used in measurement
    className,
    ref,
    render,
    children,
    ...itemProps
  } = props;

  const overflowCtx = useOverflowContext(ITEM_NAME);
  const registrationCtx = useOverflowRegistrationContext(ITEM_NAME);

  const itemId = React.useId();
  const elRef = React.useRef<HTMLElement | null>(null);
  /** Document-order index — written after every registerItem call (BUG-6 fix). */
  const indexRef = React.useRef(0);

  // Per-item selectors memoised once per itemId (itemId from useId is stable).
  const hiddenSelector = React.useMemo(() => selectorHiddenId(itemId), [itemId]);
  const overscanSelector = React.useMemo(() => selectorOverscanId(itemId), [itemId]);

  const isHidden = useStore(hiddenSelector, overflowCtx.store);
  const isOverscan = useStore(overscanSelector, overflowCtx.store);

  // BUG-5 fix: single effect, guarded post-mount flag prevents double-register
  // on initial mount. The original code had two effects that both called
  // registerItem on first render → 2× scheduleCalc per mount.
  const postMountRef = React.useRef(false);

  // Effect 1: mount / unmount — registers item and sets up cleanup.
  useIsoLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const idx = registrationCtx.registerItem(itemId, el, children, false);
    indexRef.current = idx;
    return () => {
      postMountRef.current = false;
      registrationCtx.unregisterItem(itemId);
    };
    // Intentionally excludes `children` — updates handled by Effect 2.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, registrationCtx]);

  // Effect 2: children update — re-registers to keep hiddenChildren fresh.
  // `postMountRef` guard prevents double-registration on initial mount because
  // React fires effects in declaration order: Effect 1 fires first (skipping
  // the guard isn't needed there), then Effect 2 fires and finds the flag unset.
  useIsoLayoutEffect(() => {
    if (!postMountRef.current) {
      postMountRef.current = true;
      return; // skip — Effect 1 already registered on this render
    }
    const el = elRef.current;
    if (!el) return;
    const idx = registrationCtx.registerItem(itemId, el, children, false);
    indexRef.current = idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]); // intentionally excludes itemId/registrationCtx — handled by Effect 1

  const itemContext: OverflowItemContextValue = {
    itemId,
    isHidden,
    index: indexRef.current,
  };

  const requiresLiveMeasurement =
    overflowCtx.orientation === 'grid' || overflowCtx.orientation === 'wrap';
  const shouldRenderChildren = keepMounted || !isHidden || isOverscan || requiresLiveMeasurement;
  const shouldHideWrapper = isHidden;
  const shouldWarmHidden = isHidden && isOverscan && !requiresLiveMeasurement;

  const defaultProps: useRender.ElementProps<'div'> & {
    'data-slot': string;
    'data-hidden'?: string;
  } = {
    'data-slot': 'overflow-item',
    'data-hidden': isHidden ? '' : undefined,
    'aria-hidden': isHidden ? true : undefined,
    tabIndex: isHidden ? -1 : undefined,
    style: shouldHideWrapper
      ? shouldWarmHidden
        ? {
            // Overscan / warm-hidden: fully rendered off-screen, instantly
            // revealable. `contain` prevents hidden content from influencing
            // surrounding layout.
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
            contain: 'layout paint style',
          }
        : {
            // Zero-footprint: hidden without contributing to scroll extents
            // or triggering accidental page-width expansion.
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            overflow: 'hidden',
            visibility: 'hidden',
            pointerEvents: 'none',
          }
      : undefined,
    className: cn('shrink-0', className),
    children: shouldRenderChildren ? children : null,
  };

  const element = useRender<Record<string, unknown>, HTMLElement>({
    defaultTagName: 'div',
    ref: [ref as React.Ref<HTMLDivElement>, elRef as React.Ref<HTMLDivElement>],
    render,
    props: mergeProps(defaultProps, itemProps as Record<string, unknown>),
  }) as React.ReactElement;

  return <OverflowItemContext.Provider value={itemContext}>{element}</OverflowItemContext.Provider>;
}

OverflowItem.displayName = 'OverflowItem';
