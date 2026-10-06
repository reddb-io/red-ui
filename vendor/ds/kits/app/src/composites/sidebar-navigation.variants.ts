import { tv, type VariantProps } from "tailwind-variants";

export const sidebarNavigation = tv({
  slots: {
    root: "flex w-full flex-col border-elevation-sunken-border bg-elevation-sunken-surface text-foreground shadow-elevation-sunken",
    list: "m-0 flex list-none flex-col gap-[var(--reddb-spatial-gap-sm)] p-0",
    item: "min-h-[var(--reddb-spatial-control-height-md)]",
  },
});

export type SidebarNavigationVariants = VariantProps<typeof sidebarNavigation>;
