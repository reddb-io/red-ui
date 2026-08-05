// Badge's styling. See button.variants.ts for why the classes live apart from
// the component, why colour is only ever named, never valued, and why spatial
// values name a Density role rather than a Tailwind step.
//
// Only the gap routes. A Badge sits inside running text, so its inset is a
// notch — narrower than the smallest inset the Brand's spatial scale ships a
// role for — and a value the axis has no role for is left as it is rather than
// pushed onto the nearest one, which would move what the neutral stop renders.
//
// Badge and Pill are deliberately different shapes for different jobs: a Badge
// is a rectangular status marker that sits inside other text (`rounded-md`,
// no interaction), a Pill is a round-ended token that stands on its own.

import { tv, type VariantProps } from "tailwind-variants";

const VARIANT = {
  /** The default: present without claiming attention. */
  neutral: "border-transparent bg-muted text-background",
  /** Reserved for the one status that matters on a screen. */
  primary: "border-transparent bg-primary text-background",
  /** The quietest form — the surface shows through. */
  outline: "border-muted bg-transparent text-foreground",
} as const;

export const badge = tv({
  base: "inline-flex items-center gap-[var(--reddb-spatial-gap-sm)] rounded-md border px-2 py-0.5 text-xs font-medium leading-none whitespace-nowrap",
  variants: { variant: VARIANT },
  defaultVariants: { variant: "neutral" },
});

export type BadgeVariants = VariantProps<typeof badge>;
export type BadgeVariant = NonNullable<BadgeVariants["variant"]>;

export const BADGE_VARIANTS = Object.keys(VARIANT) as readonly BadgeVariant[];
