import { tv, type VariantProps } from "tailwind-variants";
/** Density-owned artwork bounds; the SVG's own viewBox keeps its aspect ratio. */
export const stateIllustration = tv({
  base: "block h-auto max-w-full shrink-0",
  variants: { size: {
    sm: "w-[calc(var(--reddb-spatial-control-height-md)*5)]",
    md: "w-[calc(var(--reddb-spatial-control-height-md)*8)]",
    lg: "w-[calc(var(--reddb-spatial-control-height-md)*12)]",
    full: "w-full",
  } },defaultVariants:{size:"md"},
});
export type StateIllustrationSize = NonNullable<VariantProps<typeof stateIllustration>["size"]>;
export const STATE_ILLUSTRATION_SIZES = ["sm","md","lg","full"] as const;
