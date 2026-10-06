// Button's public appearance seam.
//
// Every class lives in these `tv()` contracts so a consumer can extend the
// canonical appearance without forking the element behavior. Colours resolve
// through Theme/Color Scheme roles and spatial values through Density roles;
// this module owns no appearance-axis selection or raw value.

import { tv, type VariantProps } from "tailwind-variants";
import type { Tone } from "./tone";

const VARIANT = {
  /** The affirmative action of a view — at most one per view. */
  primary: "bg-primary text-on-primary hover:opacity-90",
  /** Everything else that is still an action: outlined, not filled. */
  secondary: "border-control-edge bg-transparent text-foreground hover:border-foreground",
  /** An action that should not compete for attention. */
  ghost: "bg-transparent text-ink-muted hover:text-foreground",
} as const;

// What the action means (ADR 0026): the shared tone vocabulary, resolved by
// the compound variants below onto each Feedback Role's materials.
const TONE = {
  neutral: "",
  info: "",
  success: "",
  warning: "",
  danger: "",
} as const satisfies Record<Tone, string>;

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
    "font-medium leading-tight whitespace-nowrap",
    "transition-opacity",
    // One ink focus ring for every variant and tone (ADR 0023): 2px, offset
    // 2px, so the pixels around it are the ground and never the Button's fill.
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
  ].join(" "),
  variants: { variant: VARIANT, tone: TONE, size: SIZE, block: BLOCK },
  // Each tone keeps the variant's hierarchy: primary fills with the role's
  // fill material under its on-fill label, secondary outlines in the role's
  // border, ghost carries only the role's ink. A danger primary is therefore a
  // filled destructive action, deeper than the accent in both Color Schemes
  // and distinct from its secondary and ghost forms (ADR 0009, ADR 0023).
  compoundVariants: [
    {
      tone: "danger",
      variant: "primary",
      class: "bg-feedback-danger-fill text-feedback-danger-on-fill",
    },
    {
      tone: "danger",
      variant: "secondary",
      class: "border-feedback-danger-border text-feedback-danger-foreground hover:border-feedback-danger-foreground hover:bg-feedback-danger-surface",
    },
    {
      tone: "danger",
      variant: "ghost",
      class: "text-feedback-danger-foreground hover:text-feedback-danger-foreground hover:bg-feedback-danger-surface",
    },
    {
      tone: "success",
      variant: "primary",
      class: "bg-feedback-success-fill text-feedback-success-on-fill",
    },
    {
      tone: "success",
      variant: "secondary",
      class: "border-feedback-success-border text-feedback-success-foreground hover:border-feedback-success-foreground hover:bg-feedback-success-surface",
    },
    {
      tone: "success",
      variant: "ghost",
      class: "text-feedback-success-foreground hover:text-feedback-success-foreground hover:bg-feedback-success-surface",
    },
    {
      tone: "warning",
      variant: "primary",
      class: "bg-feedback-warning-fill text-feedback-warning-on-fill",
    },
    {
      tone: "warning",
      variant: "secondary",
      class: "border-feedback-warning-border text-feedback-warning-foreground hover:border-feedback-warning-foreground hover:bg-feedback-warning-surface",
    },
    {
      tone: "warning",
      variant: "ghost",
      class: "text-feedback-warning-foreground hover:text-feedback-warning-foreground hover:bg-feedback-warning-surface",
    },
    {
      tone: "info",
      variant: "primary",
      class: "bg-feedback-info-fill text-feedback-info-on-fill",
    },
    {
      tone: "info",
      variant: "secondary",
      class: "border-feedback-info-border text-feedback-info-foreground hover:border-feedback-info-foreground hover:bg-feedback-info-surface",
    },
    {
      tone: "info",
      variant: "ghost",
      class: "text-feedback-info-foreground hover:text-feedback-info-foreground hover:bg-feedback-info-surface",
    },
  ],
  defaultVariants: { variant: "primary", tone: "neutral", size: "md", block: false },
});

/**
 * The loading indicator, inheriting the Button variant's current colour. It
 * takes the Icon size role of the Button's size, so it matches a leading Icon
 * at every Density stop and the label does not shift when loading starts.
 */
export const buttonSpinner = tv({
  slots: {
    root: "shrink-0 motion-safe:animate-spin motion-reduce:animate-pulse",
    track: "fill-none stroke-current opacity-25",
    head: "fill-none stroke-current",
  },
  variants: {
    size: {
      sm: { root: "size-[var(--reddb-spatial-icon-size-sm)]" },
      md: { root: "size-[var(--reddb-spatial-icon-size-md)]" },
      lg: { root: "size-[var(--reddb-spatial-icon-size-lg)]" },
    },
  },
  defaultVariants: { size: "md" },
});

export type ButtonVariants = VariantProps<typeof button>;
export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;
export type ButtonTone = NonNullable<ButtonVariants["tone"]>;
/** @deprecated Button's meaning is `tone` (ADR 0026); use `ButtonTone`. Removed next release. */
export type ButtonIntent = ButtonTone;
export type ButtonSize = NonNullable<ButtonVariants["size"]>;

// Enumerated from the maps so documentation and local extensions can inspect
// the same closed vocabulary the component accepts without restating it.
export const BUTTON_VARIANTS = Object.keys(VARIANT) as readonly ButtonVariant[];
export const BUTTON_TONES = Object.keys(TONE) as readonly ButtonTone[];
/** @deprecated Button's meaning is `tone` (ADR 0026); use `BUTTON_TONES`. Removed next release. */
export const BUTTON_INTENTS = BUTTON_TONES;
export const BUTTON_SIZES = Object.keys(SIZE) as readonly ButtonSize[];
