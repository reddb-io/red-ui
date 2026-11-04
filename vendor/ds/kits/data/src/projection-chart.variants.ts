import { tv } from "tailwind-variants";
import { typeRoleMerge } from "@reddb-io/design-system/base/recipes";
/** Shared projection card hierarchy. */
export const projectionChart = tv({ slots: {
  root: "min-w-0 rounded-lg border border-muted bg-elevation-raised-surface p-[var(--reddb-spatial-inset-md)] text-foreground",
  header: "flex flex-wrap items-end justify-between gap-[var(--reddb-spatial-layout-gap-md)]",
  label: "m-0 text-body font-medium",
  headline: "m-0 text-title tabular-nums",
  context: "text-caption text-ink-muted",
  metrics: "m-0 flex flex-wrap gap-[var(--reddb-spatial-layout-gap-md)]",
  metricLabel: "text-caption text-ink-muted",
  metricValue: "m-0 text-body tabular-nums",
  annotations: "m-0 mt-[var(--reddb-spatial-gap-sm)] flex list-none flex-wrap gap-[var(--reddb-spatial-gap-md)] p-0 text-caption text-ink-muted",
} }, typeRoleMerge);
