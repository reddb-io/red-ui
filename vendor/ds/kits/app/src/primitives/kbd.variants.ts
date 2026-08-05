// Kbd's styling. See button.variants.ts for the split, the colour rule and the
// spatial rule.
//
// A key cap: monospaced, outlined, sized to sit inline in running text without
// changing the line height around it.
//
// Its size axis is the one in the Kit that does NOT route through the Density
// axis, and deliberately: a cap is sized to the text it sits in, not to the
// controls around it, so its height belongs to the type scale — and density
// re-resolves spatial tokens only, because it shrinks components rather than
// legibility (ADR 0003). A cap that shrank with the page would drift out of
// the sentence it is part of. The chord's gap is a gap like any other, and
// routes.

import { tv, type VariantProps } from "tailwind-variants";

const SIZE = {
  sm: "h-4 min-w-4 px-1 text-xs",
  md: "h-5 min-w-5 px-1.5 text-xs",
} as const;

export const kbd = tv({
  base: "inline-flex items-center justify-center rounded-sm border border-muted bg-transparent font-mono leading-none text-foreground whitespace-nowrap",
  variants: { size: SIZE },
  defaultVariants: { size: "md" },
});

/** The wrapper a multi-key chord is rendered in, and its separator. */
export const kbdChord = tv({
  slots: {
    root: "inline-flex items-center gap-[var(--reddb-spatial-gap-sm)] whitespace-nowrap",
    separator: "text-muted text-xs",
  },
});

export type KbdVariants = VariantProps<typeof kbd>;
export type KbdSize = NonNullable<KbdVariants["size"]>;

export const KBD_SIZES = Object.keys(SIZE) as readonly KbdSize[];
