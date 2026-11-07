import { tv } from "tailwind-variants";
/** Shared token-backed audio display geometry. */
export const audioMeter = tv({ slots: {
  root: "flex min-w-0 flex-col gap-[var(--reddb-spatial-gap-sm)] text-foreground",
  summary: "flex items-baseline justify-between gap-[var(--reddb-spatial-gap-md)] text-sm",
  value: "font-mono tabular-nums text-ink-muted",
  track: "flex w-full items-center gap-[var(--reddb-spatial-gap-sm)]",
  segment: "h-[var(--reddb-spatial-gap-md)] min-w-0 flex-1 rounded-sm bg-muted",
  waveform: "h-[var(--reddb-spatial-control-height-lg)] w-full text-foreground",
}, variants: { compact: { false: { root: "w-full rounded-md border border-control-edge bg-elevation-sunken-surface p-[var(--reddb-spatial-inset-md)]" }, true: { root: "inline-flex w-auto", track: "w-[var(--reddb-spatial-control-height-lg)]", segment: "h-[var(--reddb-spatial-gap-sm)]" } } }, defaultVariants: { compact: false } });
