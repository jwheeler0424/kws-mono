'use client';
// @refresh reset

/**
 * overflow.tsx — Overflow root component.
 *
 * Provides the OverflowContext (stable orientation + store) to all
 * descendants and renders the flex container that hosts OverflowGroup(s)
 * and optional OverflowActions siblings.
 *
 * See index.ts for all public exports.
 */

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import * as React from 'react';

import type { OverflowOrientation } from './types';

import { cn } from '../../lib/utils';
import { OverflowContext, type OverflowContextValue } from './context';
import { createStore } from './store';

// ─── Re-export sub-components for backward-compat direct file imports ─────────
//
// Consumers that import from "./overflow" directly
// continue to work unchanged. New code should import from "./".

export { useOverflow, useOverflowItem } from './hooks';
export { OverflowActions } from './overflow-actions';
export { OverflowAnnouncer } from './overflow-announcer';
export { OverflowGroup } from './overflow-group';
export { OverflowIndicator } from './overflow-indicator';
export { OverflowItem } from './overflow-item';
export { OverflowSeparator } from './overflow-separator';

export type { OverflowActionsProps } from './overflow-actions';
export type { OverflowAnnouncerProps } from './overflow-announcer';
export type { OverflowGroupProps } from './overflow-group';
export type { OverflowIndicatorProps } from './overflow-indicator';
export type { OverflowItemProps } from './overflow-item';
export type { OverflowSeparatorProps } from './overflow-separator';
export type { OverflowFitStrategy, OverflowInfo, OverflowOrientation } from './types';

// ─── OverflowProps ────────────────────────────────────────────────────────────

export interface OverflowProps extends useRender.ComponentProps<'div'> {
  /**
   * Which axis to detect overflow on. Consumed by OverflowGroup via context.
   * @default 'none'
   */
  orientation?: OverflowOrientation;
  /**
   * Fires when isOverflowing transitions between true and false.
   * Stored in a propsRef - never stale, never needs to be in a dep array.
   */
  onOverflowChange?: (isOverflowing: boolean) => void;
  /**
   * SSR / first-render hint: the expected number of visible items before
   * client-side measurement. Prevents a flash of all items on hydration.
   * @default 0
   */
  defaultVisibleCount?: number;
}

// ─── Overflow ─────────────────────────────────────────────────────────────────

export function Overflow(props: OverflowProps) {
  const {
    orientation = 'none',
    onOverflowChange,
    defaultVisibleCount = 0,
    className,
    id,
    ref,
    render,
    children,
    ...rootProps
  } = props;

  const instanceId = React.useId();
  const rootId = id ?? instanceId;

  const propsRef = React.useRef({ onOverflowChange });
  useIsoLayoutEffect(() => {
    propsRef.current = { onOverflowChange };
  });

  const store = React.useMemo(
    () =>
      createStore({
        visibleCount: defaultVisibleCount,
        hiddenCount: 0,
        isOverflowing: false,
        hiddenIds: new Set<string>(),
        overscanIds: new Set<string>(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useIsoLayoutEffect(() => {
    let prev = store.getState().isOverflowing;
    return store.subscribe(() => {
      const next = store.getState().isOverflowing;
      if (next !== prev) {
        prev = next;
        propsRef.current.onOverflowChange?.(next);
      }
    });
  }, [store]);

  const context = React.useMemo<OverflowContextValue>(
    () => ({ rootId, orientation, store }),
    [rootId, orientation, store],
  );

  const defaultProps: useRender.ElementProps<'div'> & {
    'data-slot': string;
    'data-orientation'?: OverflowOrientation;
  } = {
    id: rootId,
    'data-slot': 'overflow',
    'data-orientation': orientation !== 'none' ? orientation : undefined,
    className: cn('flex min-h-0 max-w-full min-w-0', className),
    children,
  };

  const element = useRender<Record<string, unknown>, HTMLElement>({
    defaultTagName: 'div',
    ref: [ref as React.Ref<HTMLDivElement>],
    render,
    props: mergeProps(defaultProps, rootProps as Record<string, unknown>),
  }) as React.ReactElement;

  return <OverflowContext.Provider value={context}>{element}</OverflowContext.Provider>;
}

Overflow.displayName = 'Overflow';
