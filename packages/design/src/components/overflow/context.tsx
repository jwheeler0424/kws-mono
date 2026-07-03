'use client';
// @refresh reset

import * as React from 'react';

import type { OverflowStore } from './store';
import type { OverflowOrientation } from './types';

// ─── OverflowContext ──────────────────────────────────────────────────────────

/**
 * Stable config — never changes after mount.
 *
 * Components that only read `orientation` or `rootId` will NOT re-render when
 * the store's counters change, because this context value is memoised and
 * stable across all store updates.
 */
export interface OverflowContextValue {
  rootId: string;
  orientation: OverflowOrientation;
  store: OverflowStore;
}

export const OverflowContext = React.createContext<OverflowContextValue | null>(null);

/**
 * Returns the nearest OverflowContext value.
 * Throws a clear error when used outside of `<Overflow>`.
 */
export function useOverflowContext(consumerName: string): OverflowContextValue {
  const ctx = React.useContext(OverflowContext);
  if (!ctx) throw new Error(`\`${consumerName}\` must be used within \`Overflow\``);
  return ctx;
}

// ─── OverflowRegistrationContext ─────────────────────────────────────────────

/**
 * Overflow participants (items, indicator, actions) call these callbacks to
 * inform the nearest OverflowGroup about their DOM elements and ReactNodes.
 *
 * `registerItem` returns the assigned document-order index so OverflowItem
 * can surface the correct value through `useOverflowItem().index` (BUG-6 fix).
 */
export interface OverflowRegistrationContextValue {
  /**
   * Registers an OverflowItem element with the measurement engine.
   * @returns The assigned document-order index for the item.
   */
  registerItem: (
    id: string,
    el: HTMLElement,
    node: React.ReactNode,
    isSeparator?: boolean,
  ) => number;
  unregisterItem: (id: string) => void;
  registerIndicator: (el: HTMLElement | null) => void;
  registerActions: (el: HTMLElement | null) => void;
  /**
   * Returns the registered ReactNode for every currently-hidden item in
   * document order, excluding separators. Called synchronously at
   * OverflowIndicator render time — always fresh because the indicator
   * re-renders whenever `hiddenIds` changes.
   */
  getHiddenNodes: () => Array<React.ReactNode>;
}

export const OverflowRegistrationContext =
  React.createContext<OverflowRegistrationContextValue | null>(null);

/**
 * Returns the nearest OverflowRegistrationContext value.
 * Throws a clear error when used outside of `<OverflowGroup>`.
 */
export function useOverflowRegistrationContext(
  consumerName: string,
): OverflowRegistrationContextValue {
  const ctx = React.useContext(OverflowRegistrationContext);
  if (!ctx) throw new Error(`\`${consumerName}\` must be used within \`OverflowGroup\``);
  return ctx;
}

// ─── OverflowItemContext ──────────────────────────────────────────────────────

/**
 * Per-item context — exposes hidden state and document-order index to
 * `useOverflowItem()`.
 */
export interface OverflowItemContextValue {
  itemId: string;
  isHidden: boolean;
  /** Document-order index (0-based). Correct after BUG-6 fix. */
  index: number;
}

export const OverflowItemContext = React.createContext<OverflowItemContextValue | null>(null);
