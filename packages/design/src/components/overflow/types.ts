'use client';

import type * as React from 'react';

// ─── OverflowOrientation ──────────────────────────────────────────────────────

/**
 * Which axis the overflow group clamps and measures.
 *
 * - `horizontal` — items packed left-to-right; excess hidden when width exceeded.
 * - `vertical`   — items stacked top-to-bottom; excess hidden when height exceeded.
 * - `wrap`       — items wrap across rows; excess hidden when height exceeded.
 * - `grid`       — CSS grid layout; excess hidden when height exceeded.
 * - `none`       — no overflow detection; all items always visible.
 */
export type OverflowOrientation = 'horizontal' | 'vertical' | 'wrap' | 'grid' | 'none';

// ─── OverflowFitStrategy ──────────────────────────────────────────────────────

/**
 * How the packing engine decides whether an item "fits" in the available space.
 *
 * - `preferred` — use the item's current rendered outer size.
 * - `min`       — use `min-width` / `min-height` as the space floor (default).
 *                 Allows more items to appear when they can be compressed.
 * - `balanced`  — try `preferred` first; fall back to `min` when space is tight.
 */
export type OverflowFitStrategy = 'preferred' | 'min' | 'balanced';

// ─── OverflowInfo ─────────────────────────────────────────────────────────────

/**
 * Snapshot of the current overflow state, passed to the OverflowIndicator
 * render-function children.
 */
export interface OverflowInfo {
  /** Number of children not rendered in the main flow. */
  hiddenCount: number;
  /** The ReactNode children that are currently hidden, in document order. */
  hiddenChildren: Array<React.ReactNode>;
  /** True when any children are hidden. */
  isOverflowing: boolean;
}
