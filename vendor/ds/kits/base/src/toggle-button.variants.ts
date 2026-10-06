// ToggleButton extends canonical Button appearance with a perceivable pressed state.
//
// Pressed is a selection, not the view's primary action, so it wears the
// shared selection language (DESIGN.md, "Interactive states"): a neutral
// surface, full-weight foreground ink, and a 2px Brand-red indicator on the
// bottom edge. The Brand red never fills a pressed control.
import { tv, type VariantProps } from "tailwind-variants";

export const toggleButton = tv({
  base: [
    "aria-pressed:bg-foreground/10 aria-pressed:text-foreground",
    "aria-pressed:border-b-2 aria-pressed:border-b-primary",
  ].join(" "),
  variants: {
    pressed: {
      true: "font-medium",
      false: "",
    },
  },
  defaultVariants: { pressed: false },
});

export type ToggleButtonVariants = VariantProps<typeof toggleButton>;
