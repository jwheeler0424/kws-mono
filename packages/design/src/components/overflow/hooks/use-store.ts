import React from "react";
import type { OverflowStore, OverflowStoreState } from "../store";

// ─── useStore ─────────────────────────────────────────────────────────────────
/**
 * Primitive selector-based external store hook.
 * Re-renders the caller only when the selected slice changes (===).
 *
 * `selector` must be a stable reference (module-level constant or memoised)
 * because the `getSnapshot` callback depends on `[store]` only.
 * Per-item closures satisfy this when created with `React.useMemo`.
 */
export function useStore<T>(selector: (state: OverflowStoreState) => T, store: OverflowStore): T {
  const getSnapshot = React.useCallback(
    () => selector(store.getState()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store], // selector is assumed stable at call-site
  );
  return React.useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    getSnapshot, // same for SSR — prevents hydration mismatch
  );
}
