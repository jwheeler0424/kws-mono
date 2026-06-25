'use client';
// @refresh reset

/**
 * overflow-group.tsx
 *
 * OverflowGroup — clipping viewport and measurement engine.
 *
 * Responsibilities:
 *   • Observes container + parent + per-item resize via ResizeObserver.
 *   • Runs `calc()` on every size change (debounced to rAF).
 *   • Exposes OverflowRegistrationContext so children can register refs.
 *   • Writes visibleCount / hiddenCount / isOverflowing / hiddenIds to the store.
 *
 * DOM read discipline — calc() reads each source exactly once per pass:
 *   1. `getComputedStyle(el)` + `el.getBoundingClientRect()` — one call each.
 *   2. `getComputedStyle(parent)` + `parent.getBoundingClientRect()` — one call each.
 *   3. `resolveSpace()` uses the pre-computed values above — zero extra reads (BUG-1 fix).
 *   4. Per-item reads via size cache (hidden items) or live `getOuterSize` (visible).
 *   5. Grid batch measurement: all writes, then all reads in one pass (O(1) reflows).
 */

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import * as React from 'react';

import type { OverflowFitStrategy } from './types';

import { cn } from '../../lib/utils';
import {
  OverflowRegistrationContext,
  useOverflowContext,
  type OverflowRegistrationContextValue,
} from './context';
import { parseAutoRepeatMinTrack, parseRepeatCount, splitTracks } from './utils/grid';
import {
  batchMeasureHeightsAtWidth,
  getOuterSize,
  getOuterSizeBounds,
  measureOuterSizeAtWidth,
  resolveSpace,
  type OuterSizeBounds,
} from './utils/measurement';
import { areSetsEqual, packGrid, packHorizontal, packVertical, packWrap } from './utils/packing';

// ─── Component name ───────────────────────────────────────────────────────────

const CONTAINER_NAME = 'OverflowGroup';

// ─── OverflowGroupProps ───────────────────────────────────────────────────────

export interface OverflowGroupProps extends useRender.ComponentProps<'div'> {
  /**
   * When true (default), the group fills available space (`flex-1 w-full`).
   * When false, the group is content-sized but can still shrink under parent
   * constraints.
   */
  fill?: boolean;
  /**
   * When true (default), anchors the measurement space to the parent content
   * box when available.
   *
   * This prevents oscillation in content-sized groups (`fill=false`) where
   * hiding items shrinks raw available width, which would then further reduce
   * measured space and cause a feedback loop that changes the visible count.
   */
  stabilizeByParent?: boolean;
  /**
   * Strategy for deciding how much space an item needs to "fit".
   *
   * - `preferred` — use the item's current rendered outer size.
   * - `min`       — use `min-width` / `min-height` as the floor (default; allows more items).
   * - `balanced`  — try `preferred` first; fall back to `min` when space is tight.
   *
   * @default 'min'
   */
  fitStrategy?: OverflowFitStrategy;
  /**
   * Number of items beyond the visible cutoff to keep mounted (but hidden).
   * Only affects OverflowItems with `keepMounted={false}`.
   *
   * Pre-mounting items just past the visible boundary lets them re-appear
   * on resize without a React subtree remount. The overscan range is buffered
   * internally so it does not slide on every single resize step, reducing
   * mount/unmount churn during continuous resizing.
   *
   * @default 0
   */
  overscan?: number;
}

// ─── OverflowGroup ────────────────────────────────────────────────────────────

export function OverflowGroup(props: OverflowGroupProps) {
  const {
    fill = true,
    stabilizeByParent = true,
    fitStrategy = 'min',
    overscan = 0,
    className,
    ref,
    render,
    children,
    ...containerProps
  } = props;

  // Keep in ref so calc() can read the latest value without needing
  // `overscan` in its own dependency array.
  const overscanRef = React.useRef(overscan);
  overscanRef.current = overscan;

  const ctx = useOverflowContext(CONTAINER_NAME);

  // ── Refs ──────────────────────────────────────────────────────────────────

  /**
   * Item registry: id → { el, index, node, isSeparator }
   * Stored in a ref so calc() always sees the latest state without
   * needing to be in a dependency array that would cause it to be re-created.
   */
  const registryRef = React.useRef(
    new Map<
      string,
      {
        el: HTMLElement;
        index: number;
        node: React.ReactNode;
        isSeparator: boolean;
      }
    >(),
  );
  /** Insertion-order id list — index-ordered by construction (BUG-6 fix). */
  const orderRef = React.useRef<Array<string>>([]);
  const indicatorRef = React.useRef<HTMLElement | null>(null);
  /** Latched true once any OverflowIndicator mounts. Never resets. */
  const hasIndicatorRef = React.useRef(false);
  const actionsRef = React.useRef<HTMLElement | null>(null);
  const containerElRef = React.useRef<HTMLElement | null>(null);
  const itemObserverRef = React.useRef<ResizeObserver | null>(null);
  const calcQueuedRef = React.useRef(false);
  const isUnmountedRef = React.useRef(false);
  const overscanRangeRef = React.useRef({ start: 0, end: 0 });
  const scheduleCalcRef = React.useRef<() => void>(() => {});

  /**
   * Size cache: id → last measured unconstrained outer dimensions.
   *
   * Consumers often apply `[data-hidden] { display:none }` which makes hidden
   * items report 0×0. Without this cache, calc() would think they all fit and
   * produce oscillation. Populated eagerly at registration and on every
   * successful live read.
   */
  const sizeCacheRef = React.useRef(new Map<string, { w: number; h: number }>());

  /**
   * Indicator size cache — preserves the last known size of the
   * OverflowIndicator across overflowing ↔ not-overflowing transitions.
   *
   * When `forceMount=false` (default), the indicator unmounts when nothing is
   * overflowing. On the next calc() pass before it re-mounts, `indicatorRef`
   * is null so live size reads as 0. Without this cache, calc() would skip
   * reserving space for the indicator and produce an incorrect visible count
   * on the first pass after a transition.
   */
  const indicatorSizeCacheRef = React.useRef({ w: 0, h: 0 });
  const actionsSizeCacheRef = React.useRef({ w: 0, h: 0 });

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Registers an item element + ReactNode with the measurement engine.
   *
   * Returns the assigned document-order index so OverflowItem can expose the
   * correct value through `useOverflowItem().index` (BUG-6 fix: the previous
   * implementation never wrote the index back to the calling component).
   */
  const registerItem = React.useCallback(
    (id: string, el: HTMLElement, node: React.ReactNode, isSeparator = false): number => {
      const prev = registryRef.current.get(id);
      const existingIndex = orderRef.current.indexOf(id);
      const index = existingIndex === -1 ? orderRef.current.length : existingIndex;
      if (existingIndex === -1) orderRef.current.push(id);
      registryRef.current.set(id, { el, index, node, isSeparator });

      // Eagerly cache size so calc() has real dimensions on the very first
      // pass, before any hide/show cycle updates the cache.
      const isHiddenNow = el.dataset.hidden !== undefined;
      const outer = getOuterSize(el);
      if (!isHiddenNow && (outer.w > 0 || outer.h > 0)) {
        sizeCacheRef.current.set(id, outer);
      }

      itemObserverRef.current?.observe(el);
      // Only schedule calc when the element reference changed or it's a new id.
      if (existingIndex === -1 || prev?.el !== el) {
        scheduleCalcRef.current();
      }
      return index;
    },
    [],
  );

  const unregisterItem = React.useCallback((id: string) => {
    const existing = registryRef.current.get(id);
    if (existing) itemObserverRef.current?.unobserve(existing.el);
    registryRef.current.delete(id);
    sizeCacheRef.current.delete(id);
    orderRef.current = orderRef.current.filter((x) => x !== id);
    scheduleCalcRef.current();
  }, []);

  const registerIndicator = React.useCallback((el: HTMLElement | null) => {
    if (indicatorRef.current === el) return;
    if (indicatorRef.current) itemObserverRef.current?.unobserve(indicatorRef.current);
    indicatorRef.current = el;
    if (el) {
      hasIndicatorRef.current = true;
      itemObserverRef.current?.observe(el);
    }
    scheduleCalcRef.current();
  }, []);

  const registerActions = React.useCallback((el: HTMLElement | null) => {
    if (actionsRef.current === el) return;
    if (actionsRef.current) itemObserverRef.current?.unobserve(actionsRef.current);
    actionsRef.current = el;
    if (el) itemObserverRef.current?.observe(el);
    scheduleCalcRef.current();
  }, []);

  /**
   * Returns the registered ReactNode for each hidden item in document order,
   * excluding separators.
   *
   * PERF-3: orderRef is insertion-ordered which equals index-order by
   * construction — the previous `.sort(by entry.index)` was redundant and
   * has been removed.
   */
  const getHiddenNodes = React.useCallback((): Array<React.ReactNode> => {
    const { hiddenIds } = ctx.store.getState();
    return orderRef.current
      .filter((id) => hiddenIds.has(id))
      .map((id) => ({ id, entry: registryRef.current.get(id) }))
      .filter(
        (x): x is { id: string; entry: NonNullable<typeof x.entry> } =>
          x.entry !== undefined && !x.entry.isSeparator,
      )
      .map((x) => x.entry.node);
  }, [ctx.store]);

  const registrationCtx = React.useMemo<OverflowRegistrationContextValue>(
    () => ({
      registerItem,
      unregisterItem,
      registerIndicator,
      registerActions,
      getHiddenNodes,
    }),
    [registerItem, unregisterItem, registerIndicator, registerActions, getHiddenNodes],
  );

  // ── calc ──────────────────────────────────────────────────────────────────

  const calc = React.useCallback(() => {
    const orientation = ctx.orientation;
    const el = containerElRef.current;

    // Build sorted item list from registry (sort by registered index).
    const items = orderRef.current
      .map((id) => {
        const entry = registryRef.current.get(id);
        return entry ? { id, ...entry } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.index - b.index);

    const n = items.length;

    if (orientation === 'none' || !el) {
      ctx.store.batch({
        visibleCount: n,
        hiddenCount: 0,
        isOverflowing: false,
        hiddenIds: new Set(),
        overscanIds: new Set(),
      });
      return;
    }

    // ── DOM reads — exactly one per source (BUG-1 fix) ───────────────────
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement;
    const parentCs = parent ? getComputedStyle(parent) : null;
    const parentRect = parent ? parent.getBoundingClientRect() : null;

    // resolveSpace uses pre-computed args — zero additional style reads (BUG-1+2 fix).
    const { contentW, contentH, parentW, parentH } = resolveSpace(
      el,
      cs,
      rect,
      parent,
      parentCs,
      parentRect,
    );

    const cssColGap = parseFloat(cs.columnGap) || 0;
    const cssRowGap = parseFloat(cs.rowGap) || 0;

    // Anchor to parent content box when available (prevents oscillation in
    // content-sized groups where hiding items would shrink available width).
    const availableW = stabilizeByParent && parentW > 0 ? parentW : contentW;
    const availableH = stabilizeByParent && parentH > 0 ? parentH : contentH;

    if (orientation === 'horizontal' && availableW <= 0) return;
    if (orientation === 'vertical' && availableH <= 0) return;
    if ((orientation === 'wrap' || orientation === 'grid') && (availableW <= 0 || availableH <= 0))
      return;

    // ── Indicator size ────────────────────────────────────────────────────
    const oel = indicatorRef.current;
    if (oel) {
      const outer = getOuterSize(oel);
      const indicatorIsVisible = oel.hasAttribute('data-visible');
      // When forceMount is used, the indicator stays mounted even when not
      // overflowing. Reset the cache in that state so a stale "+N" badge
      // width does not prevent items from being revealed on expand.
      if (outer.w > 0 || outer.h > 0 || !indicatorIsVisible) {
        indicatorSizeCacheRef.current = outer;
      }
    }
    const ow = indicatorSizeCacheRef.current.w;
    const oh = indicatorSizeCacheRef.current.h;
    const hasLiveIndicator = Boolean(oel);

    // ── Actions size ──────────────────────────────────────────────────────
    const ael = actionsRef.current;
    if (ael) {
      const outer = getOuterSize(ael);
      if (outer.w > 0 || outer.h > 0) actionsSizeCacheRef.current = outer;
    }
    const aw = actionsSizeCacheRef.current.w;
    const ah = actionsSizeCacheRef.current.h;

    // Reserve the actions footprint from the available flow space.
    const cg = cssColGap;
    const rg = cssRowGap;
    const reserveW = orientation === 'horizontal' && aw > 0 ? aw + (n > 0 ? cg : 0) : 0;
    const reserveH =
      (orientation === 'vertical' || orientation === 'wrap' || orientation === 'grid') && ah > 0
        ? ah + (n > 0 ? rg : 0)
        : 0;

    const flowW = Math.max(0, availableW - reserveW);
    const flowH = Math.max(0, availableH - reserveH);

    // ── Item size collection ──────────────────────────────────────────────

    /**
     * Returns outer size bounds for one item with size cache fallback.
     * Hidden items (data-hidden) read from the cache to avoid erroneous 0×0
     * reads when `[data-hidden] { display:none }` is in effect.
     */
    const getSizeBounds = (
      id: string,
      itemEl: HTMLElement,
      forcedWidth?: number,
    ): OuterSizeBounds => {
      if (forcedWidth !== undefined && forcedWidth > 0) {
        const measured = measureOuterSizeAtWidth(itemEl, forcedWidth);
        if (measured.w > 0 || measured.h > 0) {
          sizeCacheRef.current.set(id, measured);
          return getOuterSizeBounds(itemEl, measured);
        }
      }

      if (itemEl.dataset.hidden !== undefined) {
        const cached = sizeCacheRef.current.get(id) ?? { w: 0, h: 0 };
        return getOuterSizeBounds(itemEl, cached);
      }

      const outer = getOuterSize(itemEl);
      if (outer.w > 0 || outer.h > 0) {
        sizeCacheRef.current.set(id, outer);
        return getOuterSizeBounds(itemEl, outer);
      }
      return getOuterSizeBounds(itemEl, sizeCacheRef.current.get(id) ?? { w: 0, h: 0 });
    };

    const itemSizes = items.map((item) => getSizeBounds(item.id, item.el));

    // ── Packing (binary search, BUG-3 + BUG-4 fix) ───────────────────────

    let visibleCount = n;

    if (orientation === 'horizontal') {
      visibleCount = packHorizontal(itemSizes, flowW, cg, ow, hasLiveIndicator, fitStrategy);
    } else if (orientation === 'vertical') {
      visibleCount = packVertical(itemSizes, flowH, rg, oh, hasLiveIndicator, fitStrategy);
    } else if (orientation === 'wrap') {
      visibleCount = packWrap(
        itemSizes,
        flowW,
        flowH,
        cg,
        rg,
        ow,
        oh,
        hasLiveIndicator,
        fitStrategy,
      );
    } else if (orientation === 'grid') {
      if (process.env.NODE_ENV !== 'production' && cs.gridTemplateColumns === 'none') {
        console.warn(
          `[${CONTAINER_NAME}] orientation="grid" requires display:grid. ` +
            'gridTemplateColumns resolved to "none" — check className/style.',
        );
      }

      const template = cs.gridTemplateColumns;
      const explicitRepeat = parseRepeatCount(template);
      const trackTokens = splitTracks(template);
      const autoRepeatMin = parseAutoRepeatMinTrack(template);

      let colCount = 1;
      if (explicitRepeat !== null) {
        colCount = explicitRepeat;
      } else if (trackTokens.length > 0 && template !== 'none') {
        colCount = trackTokens.length;
      } else if (autoRepeatMin !== null) {
        colCount = Math.max(1, Math.floor((flowW + cg) / (autoRepeatMin + cg)));
      } else {
        const sample = items[0] ? getOuterSize(items[0].el).w : flowW;
        colCount = Math.max(1, Math.floor((flowW + cg) / (sample + cg)));
      }
      colCount = Math.max(1, colCount);
      const trackW = Math.max(1, (flowW - (colCount - 1) * cg) / colCount);

      // Batch all style writes then all reads — ONE forced reflow total (vs N).
      const gridMeasureItems = oel
        ? [...items.map((item) => ({ id: item.id, el: item.el })), { id: '__indicator__', el: oel }]
        : items.map((item) => ({ id: item.id, el: item.el }));
      const gridHeights = batchMeasureHeightsAtWidth(
        gridMeasureItems,
        trackW,
        sizeCacheRef.current,
      );
      const itemHeights = items.map((_, i) => gridHeights[i]);
      const indicatorH = oel ? gridHeights[items.length] : indicatorSizeCacheRef.current.h;

      visibleCount = packGrid(itemHeights, flowH, rg, colCount, indicatorH, hasLiveIndicator);
    }

    // ── Trim trailing separators ──────────────────────────────────────────
    // Prevents the group from ending with a dangling divider.
    let trimmed = visibleCount;
    while (trimmed > 0 && items[trimmed - 1].isSeparator) trimmed--;
    const effectiveVisible = visibleCount < n ? trimmed : visibleCount;
    const effectiveHidden = n - effectiveVisible;

    // ── Fast path (PERF-2) ────────────────────────────────────────────────
    // Build hiddenIds only when counts changed — avoids Set allocation on
    // every calc pass when the layout is stable.
    const prev = ctx.store.getState();
    if (
      prev.visibleCount === effectiveVisible &&
      prev.hiddenCount === effectiveHidden &&
      prev.isOverflowing === effectiveHidden > 0
    ) {
      // Counts unchanged — verify set identity for item-swap scenarios.
      const newHiddenIds = new Set(items.slice(effectiveVisible).map((i) => i.id));
      if (
        areSetsEqual(prev.hiddenIds, newHiddenIds) &&
        (overscanRef.current === 0 || areSetsEqual(prev.overscanIds, new Set()))
      ) {
        return;
      }
    }

    // ── Overscan window ───────────────────────────────────────────────────
    // Keeps a buffered chunk mounted past the visible boundary and only
    // refreshes the range when the boundary approaches the chunk edge.
    // This prevents remount churn during continuous live resize.
    const hiddenIds = new Set(items.slice(effectiveVisible).map((i) => i.id));
    const overscanWindow = Math.max(0, Math.floor(overscanRef.current));
    const overscanIds = new Set<string>();

    if (overscanWindow > 0) {
      const range = overscanRangeRef.current;
      const needsRefresh =
        range.end <= range.start ||
        range.end > n ||
        effectiveVisible < range.start ||
        effectiveVisible + overscanWindow > range.end;

      if (needsRefresh) {
        range.start = Math.max(0, effectiveVisible - overscanWindow);
        range.end = Math.min(n, effectiveVisible + overscanWindow * 2);
      }

      for (let i = range.start; i < range.end; i++) {
        const id = items[i]?.id;
        if (id && hiddenIds.has(id)) overscanIds.add(id);
      }
    } else {
      overscanRangeRef.current = { start: 0, end: 0 };
    }

    // ── Full equality guard ───────────────────────────────────────────────
    if (
      prev.visibleCount === effectiveVisible &&
      prev.hiddenCount === effectiveHidden &&
      prev.isOverflowing === effectiveHidden > 0 &&
      areSetsEqual(prev.hiddenIds, hiddenIds) &&
      areSetsEqual(prev.overscanIds, overscanIds)
    ) {
      return;
    }

    // Atomic write — one subscriber notification per calc pass.
    ctx.store.batch({
      visibleCount: effectiveVisible,
      hiddenCount: effectiveHidden,
      isOverflowing: effectiveHidden > 0,
      hiddenIds,
      overscanIds,
    });
  }, [ctx, stabilizeByParent, fitStrategy]);

  // ── scheduleCalc ──────────────────────────────────────────────────────────

  const scheduleCalc = React.useCallback(() => {
    if (calcQueuedRef.current) return;
    calcQueuedRef.current = true;
    // rAF rather than queueMicrotask: breaks the browser's "message handler"
    // chain so layout reads don't extend React's commit task — preventing
    // "message handler took Xms" long-task violations.
    requestAnimationFrame(() => {
      calcQueuedRef.current = false;
      if (isUnmountedRef.current) return;
      calc();
    });
  }, [calc]);

  const flushCalc = React.useCallback(() => {
    if (isUnmountedRef.current) return;
    calcQueuedRef.current = false;
    calc();
  }, [calc]);

  scheduleCalcRef.current = scheduleCalc;

  // Schedule on orientation / strategy change (deferred to rAF to prevent
  // forced reflow during React's commit phase).
  useIsoLayoutEffect(() => {
    scheduleCalc();
  }, [calc]);

  // Guard orphaned rAF callbacks on unmount.
  React.useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      calcQueuedRef.current = false;
    };
  }, []);

  // ── Resize observation ────────────────────────────────────────────────────

  React.useEffect(() => {
    const el = containerElRef.current;
    if (!el || ctx.orientation === 'none') return;

    // Watch container + parent. Parent observation handles unconstrained flex
    // children whose available space is determined by their parent's size.
    // scheduleCalc (rAF) prevents forced reflow during the ResizeObserver callback.
    const containerRo = new ResizeObserver(scheduleCalc);
    containerRo.observe(el);
    if (el.parentElement) containerRo.observe(el.parentElement);

    // Per-item observation: recalc when individual item content changes size
    // (async image load, dynamic label, font loading, etc.).
    const itemRo = new ResizeObserver(scheduleCalc);
    itemObserverRef.current = itemRo;
    for (const { el: itemEl } of registryRef.current.values()) {
      itemRo.observe(itemEl);
    }

    return () => {
      containerRo.disconnect();
      itemRo.disconnect();
      itemObserverRef.current = null;
    };
  }, [flushCalc, scheduleCalc, ctx.orientation]);

  // ── Render ────────────────────────────────────────────────────────────────

  const defaultProps: useRender.ElementProps<'div'> & {
    'data-slot': string;
  } = {
    'data-slot': 'overflow-group',
    className: cn(
      'relative min-h-0 max-w-full min-w-0 overflow-hidden',
      fill ? 'w-full flex-1' : 'w-auto shrink',
      className,
    ),
    children,
  };

  const element = useRender<Record<string, unknown>, HTMLElement>({
    defaultTagName: 'div',
    ref: [ref as React.Ref<HTMLDivElement>, containerElRef as React.Ref<HTMLDivElement>],
    render,
    props: mergeProps(defaultProps, containerProps as Record<string, unknown>),
  }) as React.ReactElement;

  return (
    <OverflowRegistrationContext.Provider value={registrationCtx}>
      {element}
    </OverflowRegistrationContext.Provider>
  );
}

OverflowGroup.displayName = 'OverflowGroup';
