import { tv, type VariantProps } from "tailwind-variants";

export const breadcrumbs = tv({
  slots: {
    root: "text-foreground",
    list: "m-0 flex list-none flex-wrap items-center gap-[var(--reddb-spatial-gap-sm)] ps-0",
    item: "flex items-center gap-[var(--reddb-spatial-gap-sm)]",
    current: "font-medium text-foreground",
    separator: "text-ink-muted",
  },
});

export type BreadcrumbsVariants = VariantProps<typeof breadcrumbs>;
