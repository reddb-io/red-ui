import { tv } from "tailwind-variants";
import { typeRoleMerge } from "@reddb-io/design-system/base/recipes";

/** Shared visual hierarchy for compact activity tracks. */
export const activityTimeline = tv({ slots: {
  root: "min-w-0 text-foreground",
  scroll: "overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-focus",
  rows: "m-0 grid min-w-[calc(var(--reddb-spatial-control-height-md)*20)] list-none gap-[var(--reddb-spatial-layout-gap-md)] p-0",
  row: "min-w-0",
  header: "flex flex-wrap items-baseline justify-between gap-x-[var(--reddb-spatial-layout-gap-md)] gap-y-[var(--reddb-spatial-gap-sm)]",
  title: "m-0 min-w-0 text-body font-medium",
  meta: "m-0 text-caption text-ink-muted tabular-nums",
  track: "relative mt-[var(--reddb-spatial-gap-sm)] overflow-hidden",
  event: "absolute",
  action: "mt-[var(--reddb-spatial-gap-sm)] flex justify-end",
} }, typeRoleMerge);
