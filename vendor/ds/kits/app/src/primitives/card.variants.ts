// Card's styling. See button.variants.ts for the split, the colour rule and the
// spatial rule.
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

// Each step's padding is wider than it is tall, and the axis ships one inset
// family — so a step routes the side of its inset that the axis has a role at
// the very length for, and leaves the other where it is. Routing both would
// square the padding off and change what the neutral stop renders, which is the
// one thing adopting the axis was not allowed to do.
const PADDING = {
  none: { header: "px-0 py-0", body: "px-0 py-0", footer: "px-0 py-0" },
  sm: {
    header: "px-[var(--reddb-spatial-inset-sm)] py-2",
    body: "px-[var(--reddb-spatial-inset-sm)] py-2",
    footer: "px-[var(--reddb-spatial-inset-sm)] py-2",
  },
  md: {
    header: "px-5 py-[var(--reddb-spatial-inset-md)]",
    body: "px-5 py-[var(--reddb-spatial-inset-md)]",
    footer: "px-5 py-[var(--reddb-spatial-inset-md)]",
  },
} as const;

export const card = tv({
  slots: {
    root: "flex flex-col rounded-lg border bg-transparent text-foreground",
    header: "flex flex-col gap-[var(--reddb-spatial-gap-sm)] border-b",
    title: "text-base font-medium leading-none text-foreground",
    description: "text-sm text-muted",
    body: "flex-1",
    footer:
      "flex flex-wrap items-center gap-[var(--reddb-spatial-gap-md)] border-t",
  },
  variants: { variant: VARIANT, padding: PADDING },
  defaultVariants: { variant: "outline", padding: "md" },
});

export type CardVariants = VariantProps<typeof card>;
export type CardVariant = NonNullable<CardVariants["variant"]>;
export type CardPadding = NonNullable<CardVariants["padding"]>;

export const CARD_VARIANTS = Object.keys(VARIANT) as readonly CardVariant[];
export const CARD_PADDINGS = Object.keys(PADDING) as readonly CardPadding[];
