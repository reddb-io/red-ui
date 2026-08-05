// Pill's styling. See button.variants.ts for the split, the colour rule and the
// spatial rule — under which only the medium size's inset lands on a role the
// axis ships. The small size is a notch below the narrowest one, and a value
// the axis has no role for stays a step rather than being pushed onto the
// nearest, which would move what the neutral stop renders.
//
// A Pill is round-ended (`rounded-full`) and stands on its own: a filter that
// is on, a tag, a selected facet. That is why it — unlike Badge — has a size
// axis and a dismissible affordance.

import { tv, type VariantProps } from "tailwind-variants";

const VARIANT = {
  neutral: "border-transparent bg-muted text-background",
  primary: "border-transparent bg-primary text-background",
  outline: "border-muted bg-transparent text-foreground",
} as const;

const SIZE = {
  sm: "px-2.5 py-0.5 text-xs",
  md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-sm",
} as const;

export const pill = tv({
  base: "inline-flex items-center gap-1.5 rounded-full border leading-none whitespace-nowrap",
  variants: { variant: VARIANT, size: SIZE },
  defaultVariants: { variant: "neutral", size: "md" },
});

/** The dismiss affordance, styled to inherit the Pill's own colour. */
export const pillDismiss = tv({
  base: "-me-1 inline-flex items-center justify-center rounded-full border border-transparent bg-transparent p-0.5 leading-none hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
});

export type PillVariants = VariantProps<typeof pill>;
export type PillVariant = NonNullable<PillVariants["variant"]>;
export type PillSize = NonNullable<PillVariants["size"]>;

export const PILL_VARIANTS = Object.keys(VARIANT) as readonly PillVariant[];
export const PILL_SIZES = Object.keys(SIZE) as readonly PillSize[];
