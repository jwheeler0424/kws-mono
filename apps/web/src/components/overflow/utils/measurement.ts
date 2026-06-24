"use client";
// @refresh reset

/**
 * measurement.ts
 *
 * Pure DOM measurement utilities used by the OverflowGroup calc engine.
 *
 * Sub-pixel precision:
 *   All size reads use `getBoundingClientRect()` rather than
 *   `clientWidth`/`offsetWidth`. The integer precision of the latter
 *   accumulates rounding error across many items and causes incorrect
 *   overflow cutoff calculations at high DPI.
 *
 * Forced-reflow minimisation:
 *   `batchMeasureHeightsAtWidth` uses a write-all → read-all → restore-all
 *   pattern that produces exactly ONE forced reflow for the entire item list,
 *   vs N reflows with per-item direct measurement.
 */

// ─── SavedStyle ───────────────────────────────────────────────────────────────
//
// Lifted to module scope (PERF-4): avoids re-declaring the type on every
// `batchMeasureHeightsAtWidth` invocation.

interface SavedStyle {
  position: string;
  left: string;
  top: string;
  width: string;
  display: string;
  visibility: string;
  opacity: string;
  pointerEvents: string;
}

// ─── Basic helpers ────────────────────────────────────────────────────────────

/**
 * Clamps `value` to the closed interval [min, max]. O(1).
 */
export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Parses a CSS pixel value string to a number.
 * Returns `null` for `"auto"`, `"none"`, non-finite, or empty strings.
 */
export function parseCssPixelSize(value: string): number | null {
  if (!value || value === "auto" || value === "none") return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ─── Outer size ───────────────────────────────────────────────────────────────

/**
 * Returns the outer size of `el` (content + border + padding + margin) using
 * `getBoundingClientRect()` for sub-pixel accuracy.
 */
export function getOuterSize(el: HTMLElement): { w: number; h: number } {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const ml = parseFloat(cs.marginLeft) || 0;
  const mr = parseFloat(cs.marginRight) || 0;
  const mt = parseFloat(cs.marginTop) || 0;
  const mb = parseFloat(cs.marginBottom) || 0;
  return {
    w: rect.width + ml + mr,
    h: rect.height + mt + mb,
  };
}

// ─── OuterSizeBounds ─────────────────────────────────────────────────────────

export interface OuterSizeBounds {
  minW: number;
  preferredW: number;
  maxW: number;
  minH: number;
  preferredH: number;
  maxH: number;
}

/**
 * Returns outer size bounds (min / preferred / max) for `el`, with margins
 * factored in. Used by the packing engine to decide whether an item fits
 * at a given `fitStrategy`.
 */
export function getOuterSizeBounds(
  el: HTMLElement,
  preferredSize: { w: number; h: number },
): OuterSizeBounds {
  const cs = getComputedStyle(el);
  const ml = parseFloat(cs.marginLeft) || 0;
  const mr = parseFloat(cs.marginRight) || 0;
  const mt = parseFloat(cs.marginTop) || 0;
  const mb = parseFloat(cs.marginBottom) || 0;

  const hMargins = ml + mr;
  const vMargins = mt + mb;

  const minW = (parseCssPixelSize(cs.minWidth) ?? 0) + hMargins;
  const rawMaxW = parseCssPixelSize(cs.maxWidth);
  const maxW = rawMaxW === null ? Number.POSITIVE_INFINITY : rawMaxW + hMargins;

  const minH = (parseCssPixelSize(cs.minHeight) ?? 0) + vMargins;
  const rawMaxH = parseCssPixelSize(cs.maxHeight);
  const maxH = rawMaxH === null ? Number.POSITIVE_INFINITY : rawMaxH + vMargins;

  return {
    minW,
    preferredW: clampToRange(preferredSize.w, minW, maxW),
    maxW,
    minH,
    preferredH: clampToRange(preferredSize.h, minH, maxH),
    maxH,
  };
}

// ─── resolveSpace ─────────────────────────────────────────────────────────────

export interface ResolvedSpace {
  /** Sub-pixel content width of the container (rect − border − padding). */
  contentW: number;
  /** Sub-pixel content height of the container (rect − border − padding). */
  contentH: number;
  containerRect: DOMRect;
  contentLeft: number;
  contentTop: number;
  /** Content width of the parent element (0 when no parent). */
  parentW: number;
  /** Content height of the parent element (0 when no parent). */
  parentH: number;
}

/**
 * Resolves the available content space for an OverflowGroup container using
 * pre-computed style / rect objects to avoid redundant forced reflows.
 *
 * BUG-1 fix: the caller computes `cs`, `rect`, `parentCs`, `parentRect` once.
 *   This function reads from those pre-computed objects — no additional
 *   `getComputedStyle` or `getBoundingClientRect` calls happen inside.
 *
 * BUG-2 fix: returns sub-pixel content dimensions derived directly from
 *   `getBoundingClientRect()`. The previous implementation's integer
 *   `clientWidth` fallback silently discarded the sub-pixel values.
 *
 * @param _el        - The container element (unused in computation; provided for call-site clarity).
 * @param cs         - Pre-computed `getComputedStyle(el)`.
 * @param rect       - Pre-computed `el.getBoundingClientRect()`.
 * @param _parent    - `el.parentElement` (unused in computation; provided for call-site clarity).
 * @param parentCs   - Pre-computed `getComputedStyle(parent)` or null.
 * @param parentRect - Pre-computed `parent.getBoundingClientRect()` or null.
 */
export function resolveSpace(
  _el: HTMLElement,
  cs: CSSStyleDeclaration,
  rect: DOMRect,
  _parent: HTMLElement | null,
  parentCs: CSSStyleDeclaration | null,
  parentRect: DOMRect | null,
): ResolvedSpace {
  const bl = parseFloat(cs.borderLeftWidth) || 0;
  const br = parseFloat(cs.borderRightWidth) || 0;
  const bt = parseFloat(cs.borderTopWidth) || 0;
  const bb = parseFloat(cs.borderBottomWidth) || 0;
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  const pt = parseFloat(cs.paddingTop) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;

  const selfW = rect.width - bl - br - pl - pr;
  const selfH = rect.height - bt - bb - pt - pb;

  let parentW = 0;
  let parentH = 0;
  if (parentRect && parentCs) {
    parentW =
      parentRect.width -
      (parseFloat(parentCs.borderLeftWidth) || 0) -
      (parseFloat(parentCs.borderRightWidth) || 0) -
      (parseFloat(parentCs.paddingLeft) || 0) -
      (parseFloat(parentCs.paddingRight) || 0);
    parentH =
      parentRect.height -
      (parseFloat(parentCs.borderTopWidth) || 0) -
      (parseFloat(parentCs.borderBottomWidth) || 0) -
      (parseFloat(parentCs.paddingTop) || 0) -
      (parseFloat(parentCs.paddingBottom) || 0);
  }

  return {
    // Use the sub-pixel rect values directly (BUG-2 fix: no integer clientWidth override).
    contentW: selfW > 0 ? selfW : parentW,
    contentH: selfH > 0 ? selfH : parentH,
    containerRect: rect,
    contentLeft: rect.left + bl + pl,
    contentTop: rect.top + bt + pt,
    parentW,
    parentH,
  };
}

// ─── measureOuterSizeAtWidth ──────────────────────────────────────────────────

/**
 * Forces `el` off-screen at a specific width, reads its rendered outer size,
 * then restores all styles. Causes exactly 1 forced reflow.
 *
 * For multiple elements, prefer `batchMeasureHeightsAtWidth` which writes all
 * styles before any reads, producing O(1) reflows regardless of item count.
 */
export function measureOuterSizeAtWidth(
  el: HTMLElement,
  forcedWidth: number,
): { w: number; h: number } {
  const prev: SavedStyle = {
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    display: el.style.display,
    visibility: el.style.visibility,
    opacity: el.style.opacity,
    pointerEvents: el.style.pointerEvents,
  };

  el.style.position = "absolute";
  el.style.left = "-99999px";
  el.style.top = "0";
  el.style.width = `${forcedWidth}px`;
  el.style.display = "block";
  el.style.visibility = "hidden";
  el.style.opacity = "0";
  el.style.pointerEvents = "none";

  const measured = getOuterSize(el);

  el.style.position = prev.position;
  el.style.left = prev.left;
  el.style.top = prev.top;
  el.style.width = prev.width;
  el.style.display = prev.display;
  el.style.visibility = prev.visibility;
  el.style.opacity = prev.opacity;
  el.style.pointerEvents = prev.pointerEvents;

  return measured;
}

// ─── batchMeasureHeightsAtWidth ───────────────────────────────────────────────

/**
 * Measures rendered heights of multiple elements at a forced column width
 * using a single forced reflow for the entire list.
 *
 * Pattern: write ALL styles → read ALL rects (1 reflow) → restore ALL styles.
 *
 * Compared to calling `measureOuterSizeAtWidth` N times (N reflows), this is
 * O(1) reflows regardless of item count. Critical for grid orientation where
 * every item's height must be re-measured at the track width.
 *
 * PERF-4: `SavedStyle` type and pre-allocated array are module-scoped.
 *
 * @param items       - Array of `{ id, el }` pairs to measure.
 * @param forcedWidth - Width to impose during measurement.
 * @param sizeCache   - Populated in-place with the measured outer size per id.
 * @returns Heights in the same order as `items`.
 */
export function batchMeasureHeightsAtWidth(
  items: Array<{ id: string; el: HTMLElement }>,
  forcedWidth: number,
  sizeCache: Map<string, { w: number; h: number }>,
): Array<number> {
  const count = items.length;
  // Pre-allocate (PERF-4): avoids array resizing during the write loop.
  const saved: SavedStyle[] = Array.from({ length: count });

  // Phase 1: Write all styles — one layout invalidation, no read yet.
  for (let i = 0; i < count; i++) {
    const { el } = items[i];
    saved[i] = {
      position: el.style.position,
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      display: el.style.display,
      visibility: el.style.visibility,
      opacity: el.style.opacity,
      pointerEvents: el.style.pointerEvents,
    };
    el.style.position = "absolute";
    el.style.left = "-99999px";
    el.style.top = "0";
    el.style.width = `${forcedWidth}px`;
    el.style.display = "block";
    el.style.visibility = "hidden";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
  }

  // Phase 2: Read all — the first getBoundingClientRect forces ONE layout;
  // all subsequent reads are free (layout is clean after the first flush).
  const heights: number[] = Array.from({ length: count });
  for (let i = 0; i < count; i++) {
    const { id, el } = items[i];
    const outer = getOuterSize(el);
    if (outer.w > 0 || outer.h > 0) sizeCache.set(id, outer);
    heights[i] = outer.h;
  }

  // Phase 3: Restore all styles — layout is dirtied again but no read follows.
  for (let i = 0; i < count; i++) {
    const { el } = items[i];
    const s = saved[i];
    el.style.position = s.position;
    el.style.left = s.left;
    el.style.top = s.top;
    el.style.width = s.width;
    el.style.display = s.display;
    el.style.visibility = s.visibility;
    el.style.opacity = s.opacity;
    el.style.pointerEvents = s.pointerEvents;
  }

  return heights;
}
