// ScrollArea's structural overflow seam. Its inset stays a live Density role.
import { tv, type VariantProps } from "tailwind-variants";

const ORIENTATION = {
  vertical: "overflow-x-hidden overflow-y-auto",
  horizontal: "overflow-x-auto overflow-y-hidden",
  both: "overflow-auto",
} as const;

export const scrollArea = tv({
  base: [
    "relative rounded-md border border-muted bg-background text-foreground",
    "p-[var(--reddb-spatial-inset-sm)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  ].join(" "),
  variants: { orientation: ORIENTATION },
  defaultVariants: { orientation: "vertical" },
});

export type ScrollAreaVariants = VariantProps<typeof scrollArea>;
export type ScrollAreaOrientation = NonNullable<ScrollAreaVariants["orientation"]>;
export const SCROLL_AREA_ORIENTATIONS = Object.keys(
  ORIENTATION,
) as readonly ScrollAreaOrientation[];
