import { tv, type VariantProps } from "tailwind-variants";
import type { NavbarAlign, NavbarCollapse } from "./Navbar.svelte";

const ALIGN = {
  start: {
    brand: "shrink-0",
    links: "grow justify-start",
    actions: "ms-auto shrink-0 justify-end",
  },
  center: {
    brand: "grow basis-0 justify-start",
    links: "shrink-0 justify-center",
    actions: "grow basis-0 justify-end",
  },
} as const satisfies Record<NavbarAlign, Record<"brand" | "links" | "actions", string>>;

// `responsive` collapses on the Navbar's own width, not the window's (ADR
// 0021): the root is a named size container, and the rail appears from the
// DS's `3xl` container step (48rem). A Navbar in a narrow column or a phone
// mockup therefore shows its compact arrangement on any screen.
const COLLAPSE = {
  responsive: {
    rail: "hidden @3xl/navbar:flex",
    compact: "flex @3xl/navbar:hidden",
    panel: "@3xl/navbar:hidden",
  },
  expanded: { rail: "flex", compact: "hidden", panel: "hidden" },
  collapsed: { rail: "hidden", compact: "flex", panel: "" },
} as const satisfies Record<NavbarCollapse, Record<"rail" | "compact" | "panel", string>>;

const OPEN = {
  true: { panel: "flex" },
  false: { panel: "hidden" },
} as const;

export const navbar = tv({
  slots: {
    root: "@container/navbar w-full border-b border-elevation-sunken-border bg-elevation-sunken-surface text-foreground shadow-elevation-sunken",
    rail: [
      "h-[var(--reddb-spatial-control-height-md)] w-full items-center gap-[var(--reddb-spatial-gap-lg)]",
      "px-[var(--reddb-spatial-inset-sm)]",
    ].join(" "),
    compact: [
      "h-[var(--reddb-spatial-control-height-md)] w-full items-center justify-between gap-[var(--reddb-spatial-gap-md)]",
      "px-[var(--reddb-spatial-inset-sm)]",
    ].join(" "),
    brand: "flex items-center",
    links: "m-0 flex list-none items-center gap-[var(--reddb-spatial-gap-md)] ps-0",
    actions: "flex items-center gap-[var(--reddb-spatial-gap-md)]",
    // Destinations in a masthead read as navigation, not as prose links: muted
    // ink, no underline, and the current one wears the shared selection
    // language — neutral surface, full-weight ink, and a 2px Brand-red
    // underline on the rail (a start-edge bar in the stacked panel below).
    // Every link carries the transparent edge so marking one moves nothing.
    link: [
      "inline-flex h-[var(--reddb-spatial-control-height-md)] w-auto items-center rounded-b-none border-b-2 border-transparent",
      "px-[var(--reddb-spatial-inset-sm)] leading-tight text-ink-muted no-underline",
      "hover:bg-foreground/8 hover:text-foreground",
      "aria-[current]:border-primary aria-[current]:bg-foreground/10 aria-[current]:font-medium aria-[current]:text-foreground",
    ].join(" "),
    panelLink: [
      "flex min-h-[var(--reddb-spatial-control-height-md)] w-full items-center justify-start rounded-s-none border-s-2 border-transparent",
      "px-[var(--reddb-spatial-inset-sm)] text-ink-muted no-underline",
      "hover:bg-foreground/8 hover:text-foreground",
      "aria-[current]:border-primary aria-[current]:bg-foreground/10 aria-[current]:font-medium aria-[current]:text-foreground",
    ].join(" "),
    toggle: "shrink-0",
    panel: [
      "w-full border-t border-elevation-sunken-border",
      "px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-md)]",
    ].join(" "),
    panelLinks: "m-0 flex list-none flex-col gap-[var(--reddb-spatial-gap-sm)] ps-0",
  },
  variants: { align: ALIGN, collapse: COLLAPSE, open: OPEN },
  defaultVariants: { align: "start", collapse: "responsive", open: false },
});

export type NavbarVariants = VariantProps<typeof navbar>;
