import { tv } from "tailwind-variants";

/** One compact, framework-independent mixed-chart surface. */
export const compositeChart = tv({
  slots: {
    root: "min-w-0 contain-inline-size text-foreground",
    panel: "relative m-0 flex min-h-0 min-w-0 flex-col [--color-surface-100:var(--reddb-color-background)] [--color-surface-200:var(--reddb-color-muted)] [--color-surface-300:var(--reddb-color-muted)] [--color-surface-content:var(--reddb-color-foreground)]",
    toolbar: "flex shrink-0 flex-wrap items-center justify-between gap-x-[var(--reddb-spatial-gap-md)] gap-y-[var(--reddb-spatial-gap-sm)]",
    legend: "flex min-w-0 flex-wrap items-center gap-[var(--reddb-spatial-gap-sm)]",
    legendItem: "inline-flex min-h-[var(--reddb-spatial-control-height-sm)] min-w-0 items-center gap-[var(--reddb-spatial-gap-sm)] rounded-md px-[var(--reddb-spatial-gap-sm)] text-xs aria-[pressed=false]:text-ink-muted",
    swatch: "w-[var(--reddb-spatial-inset-sm)] shrink-0",
    plot: "relative min-h-0 min-w-0 overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
    readout: "flex shrink-0 flex-wrap items-center gap-x-[var(--reddb-spatial-gap-md)] gap-y-[var(--reddb-spatial-gap-sm)] py-[var(--reddb-spatial-gap-sm)] text-xs text-ink-muted tabular-nums",
    axes: "text-xs text-ink-muted",
    empty: "absolute inset-0 flex items-center justify-center p-[var(--reddb-spatial-inset-sm)] text-caption text-ink-muted",
    dialog: "m-0 h-dvh max-h-dvh w-dvw max-w-none rounded-none p-[var(--reddb-spatial-inset-sm)]",
    header: "flex shrink-0 items-center justify-between gap-[var(--reddb-spatial-gap-md)] pb-[var(--reddb-spatial-gap-sm)]",
  },
});
