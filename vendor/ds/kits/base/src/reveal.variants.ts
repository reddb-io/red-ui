import { tv, type VariantProps } from "tailwind-variants";

export const reveal = tv({
  base: [
    "opacity-0 will-change-[opacity,transform]",
    "[transform:translate3d(var(--reveal-x),var(--reveal-y),0)]",
    "motion-reduce:!opacity-100 motion-reduce:!transform-none",
  ],
  variants: {
    direction: {
      up: "[--reveal-x:0px] [--reveal-y:1.5rem]",
      down: "[--reveal-x:0px] [--reveal-y:-1.5rem]",
      left: "[--reveal-x:-1.5rem] [--reveal-y:0px]",
      right: "[--reveal-x:1.5rem] [--reveal-y:0px]",
      none: "[--reveal-x:0px] [--reveal-y:0px]",
    },
    path: {
      css: "",
      js: [
        "transition-[opacity,transform]",
        "[transition-duration:600ms]",
        "[transition-delay:var(--reveal-delay)]",
        "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
      ],
    },
    entered: {
      true: "opacity-100 transform-none",
      false: "",
    },
    debug: {
      true: "ring-1 ring-current",
      false: "",
    },
  },
  defaultVariants: {
    direction: "up",
    path: "css",
    entered: false,
    debug: false,
  },
});

export type RevealVariants = VariantProps<typeof reveal>;
