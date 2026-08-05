// Kbd's styling. See button.variants.ts for the split and the colour rule.
//
// A key cap: monospaced, outlined, sized to sit inline in running text without
// changing the line height around it.

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
    root: "inline-flex items-center gap-1 whitespace-nowrap",
    separator: "text-muted text-xs",
  },
});

export type KbdVariants = VariantProps<typeof kbd>;
export type KbdSize = NonNullable<KbdVariants["size"]>;

export const KBD_SIZES = Object.keys(SIZE) as readonly KbdSize[];
