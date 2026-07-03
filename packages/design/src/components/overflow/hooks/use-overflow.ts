import { useOverflowContext } from '../context';
import { selectHiddenCount, selectIsOverflowing, selectVisibleCount } from '../utils/selectors';
import { useStore } from './use-store';

// ─── useOverflow ──────────────────────────────────────────────────────────────
/**
 * Reactive overflow state accessible from any descendant of `<Overflow>`.
 *
 * Each field subscribes independently — the caller re-renders only when its
 * specific value changes, not on every store write.
 *
 * `rootId` is exposed for `aria-controls` wiring in action children.
 *
 * @example
 * function ViewAllButton() {
 *   const { isOverflowing, hiddenCount } = useOverflow()
 *   if (!isOverflowing) return null
 *   return <button>View {hiddenCount} more</button>
 * }
 */
export function useOverflow() {
  const ctx = useOverflowContext('useOverflow');

  const isOverflowing = useStore(selectIsOverflowing, ctx.store);
  const visibleCount = useStore(selectVisibleCount, ctx.store);
  const hiddenCount = useStore(selectHiddenCount, ctx.store);

  return {
    isOverflowing,
    visibleCount,
    hiddenCount,
    rootId: ctx.rootId,
    orientation: ctx.orientation,
  } as const;
}
