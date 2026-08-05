// NavItem's styling. See button.variants.ts for the split and the colour rule.
//
// The active state is drawn with a tinted surface and a full-weight foreground
// rather than with an accent bar down one side: a side bar is a per-side
// border width, and the Brand ships no token family for widths — so the bar
// would be a value the Themes cannot reach, in the one component whose whole
// job is to show where you are.
//
// Opacity is doing the work an extra surface token would otherwise do, which
// is the same choice button.variants.ts made and for the same reason: the
// Tokens Layer ships no second surface yet.

import { tv, type VariantProps } from "tailwind-variants";

const ACTIVE = {
  /** Where you are. */
  true: { root: "bg-primary/10 font-medium text-foreground" },
  /** Everywhere else you could go. */
  false: {
    root: "bg-transparent text-muted hover:bg-muted/10 hover:text-foreground",
  },
} as const;

const DISABLED = {
  /** Present, visibly unavailable, and unreachable by pointer or by tab. */
  true: { root: "pointer-events-none opacity-50" },
  false: { root: "" },
} as const;

export const navItem = tv({
  slots: {
    root: "inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    icon: "shrink-0",
    label: "truncate",
    trailing: "ms-auto shrink-0",
  },
  variants: { active: ACTIVE, disabled: DISABLED },
  defaultVariants: { active: false, disabled: false },
});

export type NavItemVariants = VariantProps<typeof navItem>;
