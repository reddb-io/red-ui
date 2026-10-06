// Switch's optional appearance seam. The native checkbox supplies binary and
// form semantics; the moving thumb makes that state visible without color.

import { tv, type VariantProps } from "tailwind-variants";

export const switchControl = tv({
  base: [
    "h-[var(--reddb-spatial-control-height-sm)] w-[calc(var(--reddb-spatial-control-height-sm)*2)] shrink-0 appearance-none",
    "cursor-pointer rounded-full border border-control-edge bg-muted checked:bg-primary",
    "before:block before:h-[var(--reddb-spatial-control-height-sm)] before:w-[var(--reddb-spatial-control-height-sm)]",
    "before:rounded-full before:bg-foreground before:transition-transform checked:before:translate-x-full",
    "motion-reduce:before:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "aria-invalid:border-feedback-danger-border disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" "),
});

export type SwitchVariants = VariantProps<typeof switchControl>;
