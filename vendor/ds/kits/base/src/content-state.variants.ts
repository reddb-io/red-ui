import { tv } from "tailwind-variants";
export const contentState = tv({
  slots: {
    root: "grid min-w-0",
    region: "min-h-0 min-w-0",
    announcement: "sr-only",
  },
  variants: {
    bounded: { true: { root: "box-border min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden", region: "h-full [scrollbar-gutter:stable]" } },
  },
});
