import { tv } from "tailwind-variants";
export const circularChart = tv({ slots: {
  root: "flex min-h-0 min-w-0 flex-col gap-[var(--reddb-spatial-gap-md)] text-foreground",
  toolbar: "flex min-w-0 flex-wrap items-center justify-between gap-[var(--reddb-spatial-gap-sm)]",
  plot: "relative grid min-h-0 min-w-0 flex-1 place-items-center",
  center: "pointer-events-none absolute grid place-items-center overflow-hidden",
  legend: "flex min-w-0 flex-wrap gap-[var(--reddb-spatial-gap-sm)] text-caption",
  item: "inline-flex min-h-[var(--reddb-spatial-control-height-sm)] items-center gap-[var(--reddb-spatial-gap-sm)] border-b-2 border-transparent aria-pressed:border-foreground",
  swatch: "size-[var(--reddb-spatial-icon-size-sm)] shrink-0 rounded-full",
} });
