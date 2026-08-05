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
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
} as const;

const BLOCK = {
  /** Fills its column — a form's submit, a drawer's confirm, a mobile action. */
  true: "w-full",
  /** The default: as wide as what it says. */
  false: "",
} as const;

export const button = tv({
  base: [
    "inline-flex items-center justify-center gap-2",
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
