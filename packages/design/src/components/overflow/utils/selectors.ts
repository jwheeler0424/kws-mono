"use client";
import type { OverflowStoreState } from "../store";

// ─── Module-level selectors (PERF-1) ─────────────────────────────────────────
//
// Stable module-scope references avoid the per-render `React.useCallback`
// bookkeeping overhead. All constant selectors are pure functions with no
// closure — they can be shared across all component instances safely.

export const selectIsOverflowing = (s: OverflowStoreState): boolean => s.isOverflowing;
export const selectVisibleCount = (s: OverflowStoreState): number => s.visibleCount;
export const selectHiddenCount = (s: OverflowStoreState): number => s.hiddenCount;
export const selectHiddenIds = (s: OverflowStoreState): ReadonlySet<string> => s.hiddenIds;
export const selectOverscanIds = (s: OverflowStoreState): ReadonlySet<string> => s.overscanIds;

/**
 * Creates a per-item hidden-state selector that closes over `itemId`.
 * Memoised at call-site with `React.useMemo` so identity is stable for the
 * lifetime of the item (itemId from `React.useId()` never changes).
 */
export function selectorHiddenId(itemId: string): (s: OverflowStoreState) => boolean {
  return (s) => s.hiddenIds.has(itemId);
}

/**
 * Creates a per-item overscan-state selector that closes over `itemId`.
 * Same stability guarantee as `selectorHiddenId`.
 */
export function selectorOverscanId(itemId: string): (s: OverflowStoreState) => boolean {
  return (s) => s.overscanIds.has(itemId);
}
