// TimeField's appearance seam composes the canonical Field and Input skins;
// only the segmented clock arrangement is new.

import { tv, type VariantProps } from "tailwind-variants";
import { field } from "./field.variants";
import { input } from "./input.variants";

export const timeField = tv({
  slots: {
    root: field().root(),
    segments: "flex items-center gap-[var(--reddb-spatial-gap-sm)]",
    segment: [
      input(),
      "w-[var(--reddb-spatial-control-height-md)] px-0 text-center tabular-nums",
    ].join(" "),
    separator: "text-foreground",
  },
});

export type TimeFieldVariants = VariantProps<typeof timeField>;
