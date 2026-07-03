'use client';
// @refresh reset

import { useOverflowContext } from './context';
import { useStore } from './hooks';
import { selectHiddenCount, selectVisibleCount } from './utils/selectors';

// ─── Component name ───────────────────────────────────────────────────────────

const ANNOUNCER_NAME = 'OverflowAnnouncer';

// ─── OverflowAnnouncerProps ───────────────────────────────────────────────────

export interface OverflowAnnouncerProps {
  /**
   * Optional custom announcement string factory.
   * Receives the current visible/hidden/total counts.
   * Defaults to a natural-language summary:
   *   - "Showing N of M items. K not visible."
   *   - "Showing all N items."
   */
  announce?: (state: { visibleCount: number; hiddenCount: number; total: number }) => string;
}

// ─── OverflowAnnouncer ────────────────────────────────────────────────────────

/**
 * OverflowAnnouncer
 *
 * Visually hidden `aria-live="polite"` region that announces overflow count
 * changes to screen reader users. Mount once as a direct child of `<Overflow>`.
 *
 * @example
 * <Overflow orientation="horizontal">
 *   <OverflowAnnouncer />
 *   <OverflowGroup>…</OverflowGroup>
 * </Overflow>
 */
export function OverflowAnnouncer({ announce }: OverflowAnnouncerProps) {
  const ctx = useOverflowContext(ANNOUNCER_NAME);

  const visibleCount = useStore(selectVisibleCount, ctx.store);
  const hiddenCount = useStore(selectHiddenCount, ctx.store);

  const total = visibleCount + hiddenCount;

  const message = announce
    ? announce({ visibleCount, hiddenCount, total })
    : hiddenCount > 0
      ? `Showing ${visibleCount} of ${total} items. ${hiddenCount} not visible.`
      : `Showing all ${total} items.`;

  return (
    <span aria-live='polite' aria-atomic='true' data-slot='overflow-announcer' className='sr-only'>
      {message}
    </span>
  );
}

OverflowAnnouncer.displayName = 'OverflowAnnouncer';
