// LoadingState's styling. See button.variants.ts for the split, the colour rule
// and the spatial rule — under which the spinner's own size stays on the type
// scale it shares with the label beside it, and only the gap between them
// answers to a density stop.
//
// The spinner is an inline <svg> whose strokes are stroke-current, so its
// colour is whatever the spinner slot's text colour is — one token named once,
// instead of a stroke colour that a Theme could not reach. A CSS-only spinner
// (a bordered circle with one edge in another colour) is the usual trick and
// is not available here: a per-side border colour is a position the Brand
// ships no token family for, so the Kit's lint has nothing to check it
// against — and rightly refuses it.
//
// The label is always in the DOM. `labelHidden` moves it to `sr-only` rather
// than dropping it, because a spinner alone announces nothing: assistive
// technology gets the same sentence either way, and only the eye loses it.
//
// The rotation is gated on `motion-safe:`, so `prefers-reduced-motion: reduce`
// switches it off. Nothing else is: what remains is a whole component, not a
// component with its indicator removed. The one thing the gate does change is
// how the mark has to be drawn — under rotation the movement carries the
// shape and a faint track is enough, while a still ring is read all at once,
// so `motion-reduce:` brings the track up to meet the arc. A reader who asked
// for stillness gets a legible waiting mark and the sentence beside it.

import { tv, type VariantProps } from "tailwind-variants";

const SIZE = {
  sm: { spinner: "size-4", label: "text-xs" },
  md: { spinner: "size-5", label: "text-sm" },
  lg: { spinner: "size-8", label: "text-base" },
} as const;

const LABEL_HIDDEN = {
  /** Announced, never drawn — for a spinner that stands in a tight rail. */
  true: { label: "sr-only" },
  /** The default: the sentence is drawn next to the spinner. */
  false: { label: "" },
} as const;

export const loadingState = tv({
  slots: {
    root: "inline-flex items-center justify-center gap-[var(--reddb-spatial-gap-md)] text-muted",
    spinner: "motion-safe:animate-spin text-primary",
    track: "fill-none stroke-current opacity-25 motion-reduce:opacity-50",
    head: "fill-none stroke-current",
    label: "leading-none",
  },
  variants: { size: SIZE, labelHidden: LABEL_HIDDEN },
  defaultVariants: { size: "md", labelHidden: false },
});

export type LoadingStateVariants = VariantProps<typeof loadingState>;
export type LoadingStateSize = NonNullable<LoadingStateVariants["size"]>;

export const LOADING_STATE_SIZES = Object.keys(
  SIZE
) as readonly LoadingStateSize[];
