// Card's styling. See button.variants.ts for the split and the colour rule.
//
// A Card is several surfaces that must agree — a border the header rule has to
// match, padding the footer has to repeat — so it is expressed as tailwind-
// variants *slots* rather than as one class string. A variant then moves every
// slot at once, and no caller can style the parts out of step.
//
// The variants are `outline` and `plain` rather than a raised/elevated pair
// because the Brand ships no elevation or second-surface token yet. Inventing
// one here would put a value in the Kit that the Tokens Layer cannot explain;
// the day the Brand ships it, the variant lands with it.

import { tv, type VariantProps } from "tailwind-variants";

const VARIANT = {
  /** The default: a bounded surface, its edge drawn in the muted token. */
  outline: {
    root: "border-muted",
    header: "border-muted",
    footer: "border-muted",
  },
  /** No edge at all — for a Card that groups without fencing. */
  plain: {
    root: "border-transparent",
    header: "border-transparent",
    footer: "border-transparent",
  },
} as const;

const PADDING = {
  none: { header: "px-0 py-0", body: "px-0 py-0", footer: "px-0 py-0" },
  sm: { header: "px-3 py-2", body: "px-3 py-2", footer: "px-3 py-2" },
  md: { header: "px-5 py-4", body: "px-5 py-4", footer: "px-5 py-4" },
} as const;

export const card = tv({
  slots: {
    root: "flex flex-col rounded-lg border bg-transparent text-foreground",
    header: "flex flex-col gap-1 border-b",
    title: "text-base font-medium leading-none text-foreground",
    description: "text-sm text-muted",
    body: "flex-1",
    footer: "flex flex-wrap items-center gap-2 border-t",
  },
  variants: { variant: VARIANT, padding: PADDING },
  defaultVariants: { variant: "outline", padding: "md" },
});

export type CardVariants = VariantProps<typeof card>;
export type CardVariant = NonNullable<CardVariants["variant"]>;
export type CardPadding = NonNullable<CardVariants["padding"]>;

export const CARD_VARIANTS = Object.keys(VARIANT) as readonly CardVariant[];
export const CARD_PADDINGS = Object.keys(PADDING) as readonly CardPadding[];
