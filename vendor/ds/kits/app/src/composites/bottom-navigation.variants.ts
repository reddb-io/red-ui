import { tv, type VariantProps } from "tailwind-variants";

export const bottomNavigation = tv({
  slots: {
    root: "w-full border-t border-muted bg-background text-foreground",
    list: [
      "m-0 flex list-none items-stretch gap-[var(--reddb-spatial-gap-sm)] p-0",
      "px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)]",
    ].join(" "),
    entry: "min-w-0 flex-1",
    // A horizontal rail: the current item's 2px Brand-red indicator moves from
    // NavItem's start edge to the top edge, the one the bar shares with the
    // content above it.
    item: "min-h-[var(--reddb-spatial-control-height-lg)] justify-center rounded-none border-s-0 border-t-2 px-0 text-center has-[svg]:flex-col has-[svg]:gap-[var(--reddb-spatial-gap-sm)] has-[svg]:text-xs",
  },
});

export type BottomNavigationVariants = VariantProps<typeof bottomNavigation>;
