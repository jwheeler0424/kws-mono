"use client";

/**
 * index.ts — Barrel export for the Overflow component system.
 *
 * Import from "./" in all consumer code.
 *
 * Components:
 *   Overflow           — root context provider, renders a flex container
 *   OverflowGroup      — clipping viewport + measurement engine
 *   OverflowItem       — individually registered measurable child
 *   OverflowSeparator  — auto-hiding divider between OverflowItems
 *   OverflowIndicator  — overflow slot rendered inside the clipping boundary
 *   OverflowActions    — persistent action area, always visible
 *   OverflowAnnouncer  — visually-hidden aria-live region for screen readers
 *
 * Hooks:
 *   useOverflow        — reactive state from anywhere in the tree
 *   useOverflowItem    — per-item hidden state for animations / conditional render
 *
 * Quick usage:
 *
 *   import {
 *     Overflow, OverflowGroup, OverflowItem,
 *     OverflowIndicator, OverflowActions, OverflowAnnouncer,
 *     useOverflow, useOverflowItem,
 *   } from "./";
 */

// ─── Components ───────────────────────────────────────────────────────────────

export { Overflow } from "./overflow";
export { OverflowGroup } from "./overflow-group";
export { OverflowItem } from "./overflow-item";
export { OverflowIndicator } from "./overflow-indicator";
export { OverflowActions } from "./overflow-actions";
export { OverflowSeparator } from "./overflow-separator";
export { OverflowAnnouncer } from "./overflow-announcer";

// ─── Hooks ────────────────────────────────────────────────────────────────────

export { useOverflow, useOverflowItem } from "./hooks";

// ─── Prop types ───────────────────────────────────────────────────────────────

export type { OverflowProps } from "./overflow";
export type { OverflowGroupProps } from "./overflow-group";
export type { OverflowItemProps } from "./overflow-item";
export type { OverflowIndicatorProps } from "./overflow-indicator";
export type { OverflowActionsProps } from "./overflow-actions";
export type { OverflowSeparatorProps } from "./overflow-separator";
export type { OverflowAnnouncerProps } from "./overflow-announcer";

// ─── Value types ──────────────────────────────────────────────────────────────

export type { OverflowOrientation, OverflowFitStrategy, OverflowInfo } from "./types";
