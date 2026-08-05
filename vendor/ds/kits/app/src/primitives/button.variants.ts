// Button's styling, and nothing else.
//
// Every class the component wears lives here, in one `tv()` call, so the
// component file holds behavior only (shadcn-svelte's split) and the
// anti-hardcode lint has a single place to read a component's whole visual
// vocabulary. Consumers import `button` directly when they need the classes
// without the element — a link that should look like a button, say.
//
// Colour and radius are named through the Theme Layer's utilities
// (`bg-primary`, `rounded-md`), never through a value: those utilities resolve
// to the `--reddb-*` custom properties the active Theme reassigns, which is
// what lets one Button render under any Theme without knowing Themes exist.
// Where an emphasis change would need a colour the Brand has shipped no token
// for, the change is made with opacity rather than with an invented value.
//
// Spatial values — the control's height, its inset, the gap it holds a spinner
// at — are named the same way, through the Density axis's roles rather than
// through a Tailwind step, because a step compiles to a fixed length and a Kit
// written in steps is frozen against a density stop exactly as a Kit written in
// hex would be frozen against a Theme. A stop reassigns those roles onto the
// Brand's spacing scale (ADR 0003), so this Button renders denser inside a
// `data-density="compact"` subtree without knowing the axis exists. The neutral
// stop anchors every role at the step the Kit already shipped, so adopting the
// axis moved nothing on screen.
//
// A `[var(--reddb-*)]` arbitrary value is the one arbitrary value the Kit's
// lint allows, and for the reason it allows it in a colour position: it is a
// reference to a token, not a value of its own. Type, radius and icon scale
// stay on Tailwind's steps — density shrinks components, not legibility, so the
// spinner beside a label keeps the label's scale rather than the control's.

import { tv, type VariantProps } from "tailwind-variants";

const VARIANT = {
  /** The affirmative action of a view — at most one per view. */
  primary: "bg-primary text-background hover:opacity-90",
  /** Everything else that is still an action: outlined, not filled. */
  secondary:
    "border-muted bg-transparent text-foreground hover:border-foreground",
  /** An action that should not compete for attention. */
  ghost: "bg-transparent text-muted hover:text-foreground",
} as const;

const SIZE = {
  sm: "h-[var(--reddb-spatial-control-height-sm)] px-[var(--reddb-spatial-inset-sm)] text-sm",
  md: "h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] text-sm",
  lg: "h-[var(--reddb-spatial-control-height-lg)] px-[var(--reddb-spatial-inset-lg)] text-base",
} as const;

const BLOCK = {
  /** Fills its column — a form's submit, a drawer's confirm, a mobile action. */
  true: "w-full",
  /** The default: as wide as what it says. */
  false: "",
} as const;

export const button = tv({
  base: [
    "inline-flex items-center justify-center gap-[var(--reddb-spatial-gap-md)]",
    "rounded-md border border-transparent",
    "font-medium leading-none whitespace-nowrap",
    "transition-opacity",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    // Out of action, said twice because the platform only knows one of them:
    // `:disabled` is a <button>'s state, and an <a> — which cannot be disabled
    // at all — carries `aria-disabled` instead. One appearance either way, so
    // anchor-mode does not quietly lose the dimming a Button has always had.
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
  ].join(" "),
  variants: { variant: VARIANT, size: SIZE, block: BLOCK },
  defaultVariants: { variant: "primary", size: "md", block: false },
});

/**
 * The spinner a loading Button draws, styled to inherit the Button's own
 * colour.
 *
 * It names no colour at all — the strokes are `current`, so the spinner is
 * whatever the variant made the label: `text-background` on primary,
 * `text-foreground` on secondary. One spinner therefore serves every variant,
 * and a variant added later needs nothing here. The geometry is
 * LoadingState's, deliberately: the same arc drawn as a quarter of the circle
 * it spins inside, so a Kit does not show two different pictures of waiting.
 */
export const buttonSpinner = tv({
  slots: {
    root: "shrink-0 animate-spin",
    track: "fill-none stroke-current opacity-25",
    head: "fill-none stroke-current",
  },
  variants: {
    size: {
      sm: { root: "size-3.5" },
      md: { root: "size-4" },
      lg: { root: "size-5" },
    },
  },
  defaultVariants: { size: "md" },
});

export type ButtonVariants = VariantProps<typeof button>;
export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;
export type ButtonSize = NonNullable<ButtonVariants["size"]>;

// Enumerated from the variant maps rather than restated, so the showcase
// renders exactly the variants that exist and a new one cannot be forgotten.
export const BUTTON_VARIANTS = Object.keys(VARIANT) as readonly ButtonVariant[];
export const BUTTON_SIZES = Object.keys(SIZE) as readonly ButtonSize[];
