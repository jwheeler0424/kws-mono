"use client";

// ─── OverflowStoreState ───────────────────────────────────────────────────────

export interface OverflowStoreState {
  visibleCount: number;
  hiddenCount: number;
  isOverflowing: boolean;
  /**
   * IDs of items past `visibleCount`.
   * Used by `useOverflowItem()` for per-item hidden state.
   */
  hiddenIds: ReadonlySet<string>;
  /**
   * IDs of items in the overscan window: [visibleCount, visibleCount + overscan).
   * These items stay mounted (but hidden) even when their OverflowItem has
   * `keepMounted={false}`, reducing remount cost on resize.
   */
  overscanIds: ReadonlySet<string>;
}

// ─── OverflowStore ────────────────────────────────────────────────────────────

export interface OverflowStore {
  subscribe: (cb: () => void) => () => void;
  getState: () => OverflowStoreState;
  setState: <K extends keyof OverflowStoreState>(key: K, value: OverflowStoreState[K]) => void;
  /**
   * Applies multiple state keys in one atomic write.
   * Subscribers are notified at most once — even when all keys change —
   * preventing the cascade of sequential re-renders that individual
   * `setState` calls would produce.
   */
  batch: (updates: Partial<OverflowStoreState>) => void;
  notify: () => void;
}

// ─── createStore ─────────────────────────────────────────────────────────────

/**
 * Creates a lightweight, mutable external store compatible with
 * `React.useSyncExternalStore`.
 *
 * All mutations are synchronous. `batch` provides an atomic multi-key write
 * that triggers exactly one subscriber notification regardless of how many
 * keys were changed.
 */
export function createStore(initial: OverflowStoreState): OverflowStore {
  const listeners = new Set<() => void>();
  let state = initial;

  const notify = () => {
    for (const cb of listeners) cb();
  };

  return {
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getState: () => state,
    setState: (key, value) => {
      if (Object.is(state[key], value)) return;
      state = { ...state, [key]: value };
      notify();
    },
    batch: (updates) => {
      let changed = false;
      const next = { ...state };
      for (const k in updates) {
        const key = k as keyof OverflowStoreState;
        const val = updates[key] as OverflowStoreState[typeof key];
        if (!Object.is(next[key], val)) {
          Object.assign(next, { [key]: val });
          changed = true;
        }
      }
      if (changed) {
        state = next;
        notify();
      }
    },
    notify,
  };
}
