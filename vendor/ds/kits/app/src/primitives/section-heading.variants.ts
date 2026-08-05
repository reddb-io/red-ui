// SectionHeading's styling. See button.variants.ts for the split, the colour
// rule and the spatial rule.
//
// Slots again, for the same reason as Card: the rule under the heading, the
// title, its supporting line and the actions rail have to move together.

import { tv, type VariantProps } from "tailwind-variants";

const SIZE = {
  sm: { title: "text-base" },
  md: { title: "text-lg" },
  lg: { title: "text-2xl" },
} as const;

const RULE = {
  /** A hairline under the whole heading, in the muted token. */
  true: { root: "border-b border-muted pb-[var(--reddb-spatial-inset-sm)]" },
  /** No rule — for a heading that already sits on an edge. */
  false: { root: "border-b border-transparent pb-0" },
} as const;

export const sectionHeading = tv({
  slots: {
    root: "flex flex-wrap items-end justify-between gap-[var(--reddb-spatial-gap-lg)]",
    text: "flex flex-col gap-[var(--reddb-spatial-gap-sm)]",
    title: "font-medium leading-tight text-foreground",
    description: "text-sm text-muted",
    actions: "flex flex-wrap items-center gap-[var(--reddb-spatial-gap-md)]",
  },
  variants: { size: SIZE, rule: RULE },
  defaultVariants: { size: "md", rule: true },
});

export type SectionHeadingVariants = VariantProps<typeof sectionHeading>;
export type SectionHeadingSize = NonNullable<SectionHeadingVariants["size"]>;

export const SECTION_HEADING_SIZES = Object.keys(
  SIZE
) as readonly SectionHeadingSize[];

/**
 * Heading levels the component will render. A section heading is never an
 * `<h1>`: that belongs to the page, and a Primitive that could claim it would
 * let a Kit break a document's outline from the inside.
 */
export const SECTION_HEADING_LEVELS = [2, 3, 4, 5, 6] as const;
export type SectionHeadingLevel = (typeof SECTION_HEADING_LEVELS)[number];
