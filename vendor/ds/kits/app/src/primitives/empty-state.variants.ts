// EmptyState's styling. See button.variants.ts for the split and the colour
// rule.
//
// Slots, like Card: an empty state is a region — a media slot, a title, a
// supporting line and the action that fills the emptiness — and those have to
// move together. One `size` sets all of them, so no caller ends up with a
// large title over small copy.
//
// The `bordered` axis exists because an empty state has two jobs depending on
// where it stands: inside a bounded surface it should draw nothing (the
// surface already fences the region), and on bare page it needs its own dashed
// outline to say "this area exists and is empty" rather than "nothing loaded".

import { tv, type VariantProps } from "tailwind-variants";

const SIZE = {
  sm: {
    root: "gap-2 px-4 py-6",
    title: "text-sm",
    description: "text-xs",
    hint: "text-xs",
  },
  md: {
    root: "gap-3 px-6 py-10",
    title: "text-base",
    description: "text-sm",
    // A notch under the description at both sizes: the hint is the literal
    // thing you would type, not another sentence competing with the one above.
    hint: "text-xs",
  },
} as const;

const BORDERED = {
  /** The default: a dashed outline marking the empty region. */
  true: { root: "border-dashed border-muted" },
  /** No outline — for an empty state inside a surface that already has one. */
  false: { root: "border-transparent" },
} as const;

export const emptyState = tv({
  slots: {
    root: "flex flex-col items-center justify-center rounded-lg border text-center",
    media: "text-muted",
    title: "font-medium leading-none text-foreground",
    description: "max-w-prose text-muted",
    // The hint is code, so it is drawn as code — monospaced and boxed, the way
    // Kbd draws a key cap, so a caller cannot mistake the command for prose it
    // may paraphrase. Its outline is solid where the region's is dashed: the
    // region's edge says "empty", this one says "literal".
    hint: "max-w-full rounded-md border border-muted px-2 py-1 font-mono text-muted",
    actions: "flex flex-wrap items-center justify-center gap-2 pt-1",
  },
  variants: { size: SIZE, bordered: BORDERED },
  defaultVariants: { size: "md", bordered: true },
});

export type EmptyStateVariants = VariantProps<typeof emptyState>;
export type EmptyStateSize = NonNullable<EmptyStateVariants["size"]>;

export const EMPTY_STATE_SIZES = Object.keys(SIZE) as readonly EmptyStateSize[];
