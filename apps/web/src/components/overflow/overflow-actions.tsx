"use client";
// @refresh reset

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-effect";
import { cn } from "../../lib/utils";

import { OverflowRegistrationContext, useOverflowContext } from "./context";

// ─── Component name ───────────────────────────────────────────────────────────

const ACTIONS_NAME = "OverflowActions";

// ─── OverflowActionsProps ─────────────────────────────────────────────────────

export type OverflowActionsProps = useRender.ComponentProps<"div">;

// ─── OverflowActions ─────────────────────────────────────────────────────────

/**
 * OverflowActions
 *
 * Always-visible action slot. Can be placed in two positions relative to
 * the OverflowGroup — each with distinct layout semantics:
 *
 * **Outside OverflowGroup** (sibling):
 *   Actions are independent of item packing. Space is *not* reserved in the
 *   overflow calculation. Ideal for persistent controls (sort/filter) that
 *   should remain accessible regardless of item count.
 *
 * **Inside OverflowGroup** (child):
 *   Actions participate in layout measurement. The overflow engine reserves
 *   their width/height before packing items, so actions visually hug the
 *   indicator and the last visible item. Ideal when actions should track the
 *   overflow slot.
 *
 * Children can call `useOverflow()` to respond to the current overflow state.
 *
 * @example Outside group — persistent pinned controls
 * <Overflow orientation="horizontal">
 *   <OverflowGroup>
 *     {items.map(item => <OverflowItem key={item.id}>…</OverflowItem>)}
 *     <OverflowIndicator>{({ hiddenCount }) => <span>+{hiddenCount}</span>}</OverflowIndicator>
 *   </OverflowGroup>
 *   <OverflowActions>
 *     <ViewAllButton />
 *   </OverflowActions>
 * </Overflow>
 *
 * @example Inside group — indicator-adjacent controls
 * <Overflow orientation="horizontal">
 *   <OverflowGroup>
 *     {items.map(item => <OverflowItem key={item.id}>…</OverflowItem>)}
 *     <OverflowIndicator>{({ hiddenCount }) => <span>+{hiddenCount}</span>}</OverflowIndicator>
 *     <OverflowActions>
 *       <ViewAllButton />
 *     </OverflowActions>
 *   </OverflowGroup>
 * </Overflow>
 */
export function OverflowActions(props: OverflowActionsProps) {
  const { children, className, ref, render, ...actionsProps } = props;

  // Validates placement — throws with a clear message when used outside Overflow.
  useOverflowContext(ACTIONS_NAME);

  // Registration context is null when OverflowActions is placed outside
  // OverflowGroup (sibling). In that case, skip registration entirely —
  // space is not reserved in the overflow calculation (by design).
  const registrationCtx = React.useContext(OverflowRegistrationContext);
  const elRef = React.useRef<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!registrationCtx) return;
    registrationCtx.registerActions(elRef.current);
    return () => registrationCtx.registerActions(null);
  }, [registrationCtx]);

  const defaultProps: useRender.ElementProps<"div"> & {
    "data-slot": string;
  } = {
    "data-slot": "overflow-actions",
    className: cn("shrink-0", className),
    children,
  };

  return useRender<Record<string, unknown>, HTMLElement>({
    defaultTagName: "div",
    ref: [ref as React.Ref<HTMLDivElement>, elRef as React.Ref<HTMLDivElement>],
    render,
    props: mergeProps(defaultProps, actionsProps as Record<string, unknown>),
  }) as React.ReactElement;
}

OverflowActions.displayName = "OverflowActions";
