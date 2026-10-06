// Swap adds only the stable one-cell boundary around ToggleButton's appearance.
import { tv, type VariantProps } from "tailwind-variants";

export const swap = tv({
  base: "inline-grid place-items-center",
});

export type SwapVariants = VariantProps<typeof swap>;
