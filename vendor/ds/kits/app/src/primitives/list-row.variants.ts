// ListRow's styling. See button.variants.ts for the split and the colour rule.
//
// Slots, because a row is a rail: a leading affordance, a two-line text block
// that must truncate rather than wrap, and a trailing rail pushed to the end.
// Those four have to agree about height and gap, so one `density` moves them
// together.
//
// `interactive` is not a caller's choice — the component sets it from whether
// the row actually does anything (see ListRow.svelte). A row that looks
// pressable and is not is the lie this axis exists to prevent, so it cannot be
// set independently of the element that carries the behavior.

import { tv, type VariantProps } from "tailwind-variants";

const DENSITY = {
  /** The default: a row you can hit with a thumb. */
  comfortable: { root: "gap-3 px-4 py-3" },
  /** For long lists where the scan matters more than the target. */
  compact: { root: "gap-2 px-3 py-2" },
} as const;

const INTERACTIVE = {
  true: {
    root: "cursor-pointer hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  },
  false: { root: "" },
} as const;

const SELECTED = {
  /** The row this list is currently about. */
  true: { root: "bg-muted/15", title: "text-foreground" },
  false: { root: "" },
} as const;

export const listRow = tv({
  slots: {
    // `text-start` rather than the browser's default, because this same row is
    // sometimes a <button>, which centres its text.
    root: "flex w-full items-center border-b border-muted text-start",
    leading: "flex shrink-0 items-center",
    text: "flex min-w-0 flex-col gap-0.5",
    title: "truncate text-sm font-medium text-foreground",
    description: "truncate text-xs text-muted",
    trailing: "ms-auto flex shrink-0 items-center gap-2",
  },
  variants: { density: DENSITY, interactive: INTERACTIVE, selected: SELECTED },
  defaultVariants: {
    density: "comfortable",
    interactive: false,
    selected: false,
  },
});

export type ListRowVariants = VariantProps<typeof listRow>;
export type ListRowDensity = NonNullable<ListRowVariants["density"]>;

export const LIST_ROW_DENSITIES = Object.keys(
  DENSITY
) as readonly ListRowDensity[];
