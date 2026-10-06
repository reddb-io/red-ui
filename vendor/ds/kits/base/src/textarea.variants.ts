// Textarea's public appearance seam. The native multiline behavior stays in
// the element; consumers can extend this appearance without copying it.

import { tv, type VariantProps } from "tailwind-variants";

export const textarea = tv({
  base: [
    "flex min-h-[var(--reddb-spatial-control-height-lg)] w-full resize-y",
    "rounded-md border border-control-edge bg-background",
    "px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)]",
    "text-sm text-foreground placeholder:text-ink-muted",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "aria-invalid:border-feedback-danger-border",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" "),
});

export type TextareaVariants = VariantProps<typeof textarea>;
