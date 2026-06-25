"use client";
// @refresh reset

/**
 * packing.ts
 *
 * Overflow packing algorithms for each layout orientation.
 *
 * Monotonicity guarantee:
 *   All `canFit(k)` predicates are monotonically non-increasing:
 *   `canFit(k) = true ⟹ canFit(k − 1) = true`
 *
 *   This makes them amenable to binary search, giving O(n log n) total
 *   complexity. The previous linear scan (for k = 0..n: if canFit(k)) was
 *   O(n²) — a critical bottleneck for lists with many items.
 *
 * Binary search pattern used throughout (find max k in [0, n]):
 *   lo = 0, hi = n
 *   while (lo < hi) { mid = (lo + hi + 1) >> 1; canFit(mid) ? lo=mid : hi=mid−1 }
 *   result = lo
 */

import type { OuterSizeBounds } from "./measurement";
import type { OverflowFitStrategy } from "../types";

// ─── areSetsEqual ─────────────────────────────────────────────────────────────

/**
 * O(n) shallow equality for `ReadonlySet<string>`.
 * Early-exits on size mismatch. Used to skip `store.batch` when `hiddenIds`
 * has not changed between calc passes.
 */
export function areSetsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

// ─── pickAxisFitSize ──────────────────────────────────────────────────────────

/**
 * Resolves the fit size for an item along one axis based on the active strategy.
 *
 * - `preferred` — current rendered outer size.
 * - `min`       — `min-width` / `min-height` CSS floor (allows more items to fit).
 * - `balanced`  — tries `preferred` first; falls back to `min` when remainingSpace
 *                 is insufficient for the preferred size.
 */
export function pickAxisFitSize(
  bounds: OuterSizeBounds,
  axis: "w" | "h",
  strategy: OverflowFitStrategy,
  remainingSpace = Number.POSITIVE_INFINITY,
): number {
  const preferred = axis === "w" ? bounds.preferredW : bounds.preferredH;
  const min = axis === "w" ? bounds.minW : bounds.minH;
  const floor = min > 0 ? min : preferred;

  if (strategy === "preferred") return preferred;
  if (strategy === "min") return floor;
  // balanced
  return preferred <= remainingSpace ? preferred : floor;
}

// ─── packHorizontal ───────────────────────────────────────────────────────────

/**
 * Returns the maximum number of items that fit in a horizontal layout.
 *
 * Binary search O(n log n). Reserves indicator slot width for all positions
 * except the last when an indicator is present.
 *
 * BUG-3 fix: replaces the previous O(n²) linear scan `for k=0..n`.
 */
export function packHorizontal(
  itemSizes: Array<OuterSizeBounds>,
  flowW: number,
  colGap: number,
  indicatorW: number,
  hasIndicator: boolean,
  strategy: OverflowFitStrategy,
): number {
  const n = itemSizes.length;
  if (n === 0) return 0;

  // Fast path: check whether everything fits without indicator overhead.
  const totalWidth = itemSizes.reduce(
    (sum, bounds, i) => sum + (i > 0 ? colGap : 0) + pickAxisFitSize(bounds, "w", strategy),
    0,
  );
  if (totalWidth <= flowW) return n;

  // Binary search for the maximum visible count.
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (_canShowHorizontal(itemSizes, mid, n, flowW, colGap, indicatorW, hasIndicator, strategy)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

function _canShowHorizontal(
  itemSizes: Array<OuterSizeBounds>,
  visible: number,
  total: number,
  flowW: number,
  colGap: number,
  indicatorW: number,
  hasIndicator: boolean,
  strategy: OverflowFitStrategy,
): boolean {
  if (visible === total) {
    // All items visible — no indicator slot needed.
    const w = itemSizes.reduce(
      (sum, bounds, i) => sum + (i > 0 ? colGap : 0) + pickAxisFitSize(bounds, "w", strategy),
      0,
    );
    return w <= flowW;
  }

  let used = 0;
  for (let i = 0; i < visible; i++) {
    const g = i > 0 ? colGap : 0;
    const indicatorSlot = hasIndicator ? colGap + indicatorW : 0;
    const remaining = Math.max(0, flowW - used - g - indicatorSlot);
    const w = pickAxisFitSize(itemSizes[i], "w", strategy, remaining);
    if (used + g + w + indicatorSlot > flowW) return false;
    used += g + w;
  }
  return true;
}

// ─── packVertical ─────────────────────────────────────────────────────────────

/**
 * Returns the maximum number of items that fit in a vertical layout.
 *
 * Binary search O(n log n).
 *
 * BUG-3 fix: replaces the previous O(n²) linear scan.
 */
export function packVertical(
  itemSizes: Array<OuterSizeBounds>,
  flowH: number,
  rowGap: number,
  indicatorH: number,
  hasIndicator: boolean,
  strategy: OverflowFitStrategy,
): number {
  const n = itemSizes.length;
  if (n === 0) return 0;

  // Fast path
  const totalHeight = itemSizes.reduce(
    (sum, bounds, i) => sum + (i > 0 ? rowGap : 0) + pickAxisFitSize(bounds, "h", strategy),
    0,
  );
  if (totalHeight <= flowH) return n;

  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (_canShowVertical(itemSizes, mid, n, flowH, rowGap, indicatorH, hasIndicator, strategy)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

function _canShowVertical(
  itemSizes: Array<OuterSizeBounds>,
  visible: number,
  total: number,
  flowH: number,
  rowGap: number,
  indicatorH: number,
  hasIndicator: boolean,
  strategy: OverflowFitStrategy,
): boolean {
  if (visible === total) {
    const h = itemSizes.reduce(
      (sum, bounds, i) => sum + (i > 0 ? rowGap : 0) + pickAxisFitSize(bounds, "h", strategy),
      0,
    );
    return h <= flowH;
  }

  let used = 0;
  for (let i = 0; i < visible; i++) {
    const g = i > 0 ? rowGap : 0;
    const indicatorSlot = hasIndicator ? rowGap + indicatorH : 0;
    const remaining = Math.max(0, flowH - used - g - indicatorSlot);
    const h = pickAxisFitSize(itemSizes[i], "h", strategy, remaining);
    if (used + g + h + indicatorSlot > flowH) return false;
    used += g + h;
  }
  return true;
}

// ─── packWrap ─────────────────────────────────────────────────────────────────

/**
 * Returns the maximum number of items that fit in a wrapping layout.
 *
 * Binary search O(n log n). Monotone: if `k` items fit, `k − 1` also fits.
 *
 * BUG-3 fix: replaces the previous O(n²) linear scan.
 */
export function packWrap(
  itemSizes: Array<OuterSizeBounds>,
  flowW: number,
  flowH: number,
  colGap: number,
  rowGap: number,
  indicatorW: number,
  indicatorH: number,
  hasIndicator: boolean,
  strategy: OverflowFitStrategy,
): number {
  const n = itemSizes.length;

  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (
      _canFitWrap(
        itemSizes,
        mid,
        n,
        flowW,
        flowH,
        colGap,
        rowGap,
        indicatorW,
        indicatorH,
        hasIndicator,
        strategy,
      )
    ) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

function _canFitWrap(
  itemSizes: Array<OuterSizeBounds>,
  visible: number,
  total: number,
  flowW: number,
  flowH: number,
  colGap: number,
  rowGap: number,
  indicatorW: number,
  indicatorH: number,
  hasIndicator: boolean,
  strategy: OverflowFitStrategy,
): boolean {
  let rowUsedW = 0;
  let rowH = 0;
  let usedH = 0;

  const packItem = (w: number, h: number): boolean => {
    const nextW = rowUsedW === 0 ? w : rowUsedW + colGap + w;
    if (rowUsedW > 0 && nextW > flowW) {
      // Item wraps to next row — commit current row height.
      const nextUsedH = usedH + (usedH > 0 ? rowGap : 0) + rowH;
      if (nextUsedH > flowH) return false;
      usedH = nextUsedH;
      rowUsedW = w;
      rowH = h;
      return true;
    }
    rowUsedW = nextW;
    rowH = Math.max(rowH, h);
    return true;
  };

  for (let i = 0; i < visible; i++) {
    const remainingRowSpace = Math.max(0, flowW - (rowUsedW === 0 ? 0 : rowUsedW + colGap));
    const w = pickAxisFitSize(itemSizes[i], "w", strategy, remainingRowSpace);
    const h = pickAxisFitSize(itemSizes[i], "h", strategy);
    if (!packItem(w, h)) return false;
  }

  if (visible < total && hasIndicator && !packItem(indicatorW, indicatorH)) return false;

  const totalH = usedH + (usedH > 0 ? rowGap : 0) + rowH;
  return totalH <= flowH;
}

// ─── packGrid ─────────────────────────────────────────────────────────────────

/**
 * Returns the maximum number of items that fit in a grid layout.
 *
 * Binary search O(n log n). Monotone: if `k` items fit, `k − 1` also fits.
 *
 * BUG-4 fix: replaces the previous O(n²) linear scan.
 *
 * UX rule: when `hasIndicator` is true and the best visible count lands
 * exactly on a row boundary (the indicator would be alone on a new row in a
 * multi-column grid), one extra item is shifted into hidden so the indicator
 * shares the previous row with real content.
 */
export function packGrid(
  itemHeights: Array<number>,
  flowH: number,
  rowGap: number,
  colCount: number,
  indicatorH: number,
  hasIndicator: boolean,
): number {
  const n = itemHeights.length;

  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (_canFitGrid(itemHeights, mid, n, flowH, rowGap, colCount, indicatorH, hasIndicator)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const best = lo;

  // Avoid the indicator being the sole item on a new grid row.
  const avoidLonelyIndicatorRow =
    hasIndicator && colCount > 1 && best > 0 && best < n && best % colCount === 0;

  return avoidLonelyIndicatorRow ? best - 1 : best;
}

function _canFitGrid(
  itemHeights: Array<number>,
  visible: number,
  total: number,
  flowH: number,
  rowGap: number,
  colCount: number,
  indicatorH: number,
  hasIndicator: boolean,
): boolean {
  const rowHeights: Array<number> = [];

  for (let i = 0; i < visible; i++) {
    const row = Math.floor(i / colCount);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, itemHeights[i]);
  }

  if (visible < total && hasIndicator) {
    const indicatorRow = Math.floor(visible / colCount);
    rowHeights[indicatorRow] = Math.max(rowHeights[indicatorRow] ?? 0, indicatorH);
  }

  if (rowHeights.length === 0) return true;

  let totalH = 0;
  for (let i = 0; i < rowHeights.length; i++) {
    totalH += rowHeights[i];
    if (i > 0) totalH += rowGap;
  }
  return totalH <= flowH + 0.5;
}
