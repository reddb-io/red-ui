import { tv, type VariantProps } from "tailwind-variants";

/** Token-only rail appearance; SidebarRail.svelte owns focus and selection emission. */
export const sidebarRail = tv({
  slots: {
    root: [
      "flex h-full min-h-0 w-[calc(var(--reddb-spatial-control-height-md)+2*var(--reddb-spatial-inset-sm))] shrink-0 flex-col items-center",
      "gap-[var(--reddb-spatial-gap-sm)] border-e border-elevation-sunken-border bg-elevation-sunken-surface shadow-elevation-sunken",
      "p-[var(--reddb-spatial-inset-sm)] text-foreground",
    ].join(" "),
    region: "flex w-full shrink-0 flex-col items-center gap-[var(--reddb-spatial-gap-sm)]",
    middle: "min-h-0 flex-1 overflow-y-auto",
    list: "m-0 flex w-full list-none flex-col items-center gap-[var(--reddb-spatial-gap-sm)] p-0",
    // The selected destination wears the shared selection language: neutral
    // surface, foreground ink, and a 2px Brand-red start-edge bar — never a red
    // outline. Every item carries the transparent edge so selection moves
    // nothing (DESIGN.md, "Interactive states").
    item: [
      "relative size-[var(--reddb-spatial-control-height-md)] shrink-0 overflow-visible rounded-s-none rounded-e-md border-0 border-s-2 border-transparent p-0",
      "text-sm font-medium text-ink-muted hover:bg-foreground/8 hover:text-foreground",
      "aria-pressed:border-primary aria-pressed:bg-foreground/10 aria-pressed:text-foreground",
      // Focus is the ink focus outline every DS control draws (ADR 0023),
      // drawn inside the item: the middle region scrolls, and the rail's
      // content box is exactly one item wide, so an outline outside the item
      // would be clipped on both sides by the scroll region.
      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
    ].join(" "),
    fallback: "inline-flex size-full items-center justify-center",
  },
});

export type SidebarRailVariants = VariantProps<typeof sidebarRail>;
