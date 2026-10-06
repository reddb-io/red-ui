// NavItem's styling. See button.variants.ts for the split, the colour rule and
// the spatial rule.
//
// The active state wears the shared selection language (DESIGN.md,
// "Interactive states"): a neutral surface, full-weight foreground ink, and a
// 2px Brand-red bar on the start edge. The bar's colour is the `primary` role
// the Themes reassign; its width is a plain border width, like every other
// rule the Kits draw. Every item carries the same edge, transparent until it
// is current, so moving the current page shifts nothing. The Brand red never
// fills the item — it marks the primary action, and here it only points.
//
// A horizontal rail of items (BottomNavigation) moves the bar to the edge it
// sits against through its own slot class.
//
// Opacity is doing the work an extra surface token would otherwise do, which
// is the same choice button.variants.ts made and for the same reason: the
// Tokens Layer ships no second surface yet.

import { tv, type VariantProps } from "tailwind-variants";

// Current-ness is `current` on an item (ADR 0026), as on the Base Navbar's
// links; `active` is its one-release alias, in the recipe as on the component.
const CURRENT = {
  /** Where you are. */
  true: { root: "border-primary bg-foreground/10 font-medium text-foreground" },
  /** Everywhere else you could go. */
  false: { root: "border-transparent bg-transparent text-ink-muted hover:bg-foreground/8 hover:text-foreground" },
} as const;

const DISABLED = {
  /** Present, visibly unavailable, and unreachable by pointer or by tab. */
  true: { root: "pointer-events-none opacity-50" },
  false: { root: "" },
} as const;

export const navItem = tv({
  slots: {
    // Focus is the ink focus outline every DS control draws (ADR 0023).
    root: "inline-flex w-full items-center gap-[var(--reddb-spatial-gap-md)] rounded-s-none rounded-e-md border-s-2 min-h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-sm)] text-sm leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    icon: "shrink-0",
    label: "truncate",
    trailing: "ms-auto shrink-0",
  },
  variants: {
    current: CURRENT,
    /** @deprecated Renamed `current` (ADR 0026); removed next release. */
    active: { true: CURRENT.true, false: {} },
    disabled: DISABLED,
  },
  defaultVariants: { current: false, disabled: false },
});

export type NavItemVariants = VariantProps<typeof navItem>;
