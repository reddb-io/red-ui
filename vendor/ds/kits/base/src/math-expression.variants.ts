import { tv } from "tailwind-variants";

/** Appearance for already-rendered, accessible mathematical content. */
export const mathExpression = tv({
  base: "min-w-0 text-foreground",
  variants: {
    display: {
      inline: "inline",
      block: "block overflow-x-auto py-[var(--reddb-spatial-inset-sm)] text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    },
  },
  defaultVariants: { display: "inline" },
});
