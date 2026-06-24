"use client";
// @refresh reset

import * as React from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-effect";
import { cn } from "../../lib/utils";

import { Separator } from "../ui/separator";

import { useOverflowContext, useOverflowRegistrationContext } from "./context";
import { useStore } from "./hooks";
import { selectorHiddenId } from "./utils/selectors";

// ─── Component name ───────────────────────────────────────────────────────────

const SEPARATOR_NAME = "OverflowSeparator";

// ─── OverflowSeparatorProps ───────────────────────────────────────────────────

export interface OverflowSeparatorProps {
  /**
   * Visual orientation of the separator line.
   *
   * Defaults to `"vertical"` — correct for horizontal overflow rows where the
   * divider runs vertically between items. Set to `"horizontal"` for
   * vertical/stacked layouts.
   *
   * @default 'vertical'
   */
  orientation?: "horizontal" | "vertical";
  /** Additional inline styles applied to the outer wrapper `<span>`. */
  style?: React.CSSProperties;
  /** Additional CSS class names applied to the outer wrapper `<span>`. */
  className?: string;
}

// ─── OverflowSeparator ────────────────────────────────────────────────────────

/**
 * OverflowSeparator
 *
 * A thin divider between OverflowItems that automatically disappears when
 * it would otherwise become the last visible element in the group (trailing
 * separator prevention).
 *
 * Uses the shadcn `Separator` under the hood and participates in the same
 * registration / measurement cycle as OverflowItem, so the overflow
 * calculation accounts for its physical size.
 *
 * Place it directly between two OverflowItems inside an OverflowGroup:
 *
 * @example
 * <OverflowGroup className="flex items-center gap-2">
 *   <OverflowItem>A</OverflowItem>
 *   <OverflowSeparator />
 *   <OverflowItem>B</OverflowItem>
 *   <OverflowSeparator />
 *   <OverflowItem>C</OverflowItem>
 *   <OverflowIndicator>…</OverflowIndicator>
 * </OverflowGroup>
 */
export function OverflowSeparator({
  orientation = "vertical",
  style,
  className,
}: OverflowSeparatorProps) {
  const overflowCtx = useOverflowContext(SEPARATOR_NAME);
  const registrationCtx = useOverflowRegistrationContext(SEPARATOR_NAME);

  const itemId = React.useId();
  const elRef = React.useRef<HTMLElement | null>(null);

  // Per-item hidden selector (same pattern as OverflowItem).
  const hiddenSelector = React.useMemo(() => selectorHiddenId(itemId), [itemId]);
  const isHidden = useStore(hiddenSelector, overflowCtx.store);

  // Register as a separator so calc() can trim trailing ones.
  useIsomorphicLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    registrationCtx.registerItem(itemId, el, null, /* isSeparator= */ true);
    return () => registrationCtx.unregisterItem(itemId);
  }, [itemId, registrationCtx]);

  return (
    <span
      ref={elRef as React.Ref<HTMLSpanElement>}
      data-slot="overflow-separator"
      data-hidden={isHidden ? "" : undefined}
      aria-hidden="true"
      style={style}
      className={cn(
        "shrink-0 self-stretch",
        isHidden && "pointer-events-none invisible",
        className,
      )}
    >
      <Separator
        orientation={orientation}
        className={cn(orientation === "vertical" ? "h-full w-px" : "h-px w-full")}
      />
    </span>
  );
}

OverflowSeparator.displayName = "OverflowSeparator";
