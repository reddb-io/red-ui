import { tv } from "tailwind-variants";
/** Density-aware layout for a terminal outcome and its recovery actions. */
export const outcomeScreen = tv({
  slots: {
    root: "flex w-full items-center justify-center bg-background p-[var(--reddb-spatial-section-inset)] text-foreground",
    content: "flex w-full max-w-[var(--reddb-container-prose)] flex-col items-center gap-[var(--reddb-spatial-gap-lg)] text-center",
    identity: "flex items-center justify-center",
    description: "max-w-prose text-ink-muted",
    note: "max-w-prose text-caption text-ink-muted",
    actions: "flex flex-wrap items-center justify-center gap-[var(--reddb-spatial-gap-md)]",
  },
  variants: { fullPage: { true: {root: "min-h-[100dvh]"}, false: {root: "min-h-full"} } },
  defaultVariants: { fullPage: true },
});
