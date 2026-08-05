// SplitView's styling. See button.variants.ts for the split, the colour rule
// and the spatial rule.
//
// The pane sizes are NOT here, and cannot be: the divider's position is a
// runtime number, so it reaches the element as an inline `flex-basis` rather
// than as a class. That is not a hardcoded value in the sense the Kit's lint
// cares about — it carries no Brand decision, only where the user last let go
// of the divider — and there is no class name that could express it.
//
// It follows that this is the one component in the Kit with nothing for the
// Density axis to re-resolve. Everything spatial about a SplitView is either
// that runtime fraction or the divider's own thickness, and a rule's thickness
// is a width — a dimension the Brand ships no token family for at all, which is
// the same reason nav-item.variants.ts draws its active state without an accent
// bar. A stop still reaches the panes' contents, which is where the space a
// reader actually sees lives.

import { tv, type VariantProps } from "tailwind-variants";

const ORIENTATION = {
  /** Panes side by side, divided by a vertical rule. */
  horizontal: { root: "flex-row", divider: "w-1 cursor-col-resize" },
  /** Panes stacked, divided by a horizontal one. */
  vertical: { root: "flex-col", divider: "h-1 cursor-row-resize" },
} as const;

const DRAGGING = {
  /** While the divider is held: the rule takes the accent it is being moved by. */
  true: { divider: "bg-primary" },
  false: { divider: "bg-muted/40 hover:bg-muted" },
} as const;

export const splitView = tv({
  slots: {
    root: "flex w-full items-stretch overflow-hidden",
    // `min-w-0`/`min-h-0`: without them a flex item refuses to shrink below
    // its content, and the divider stops halfway through a drag for reasons
    // nothing on screen explains.
    pane: "min-h-0 min-w-0 grow-0 overflow-auto",
    divider:
      "shrink-0 touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  },
  variants: { orientation: ORIENTATION, dragging: DRAGGING },
  defaultVariants: { orientation: "horizontal", dragging: false },
});

export type SplitViewVariants = VariantProps<typeof splitView>;
