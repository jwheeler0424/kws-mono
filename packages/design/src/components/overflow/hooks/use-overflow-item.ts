import * as React from 'react';

import { OverflowItemContext, type OverflowItemContextValue } from '../context';

// ─── useOverflowItem ──────────────────────────────────────────────────────────

/**
 * Per-item hidden state. Must be used inside an `<OverflowItem>` subtree.
 *
 * Enables exit animations, conditional content, or aria feedback based on
 * whether this specific item is currently hidden. `index` is the item's
 * document-order position (0-based).
 *
 * @example
 * function NavPill({ label }: { label: string }) {
 *   const { isHidden } = useOverflowItem()
 *   return (
 *     <span data-hidden={isHidden || undefined}>
 *       {label}
 *     </span>
 *   )
 * }
 */
export function useOverflowItem(): OverflowItemContextValue {
  const ctx = React.useContext(OverflowItemContext);
  if (!ctx) throw new Error('`useOverflowItem` must be used within `OverflowItem`');
  return ctx;
}
