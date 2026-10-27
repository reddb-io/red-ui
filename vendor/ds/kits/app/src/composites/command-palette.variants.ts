import { tv, type VariantProps } from "tailwind-variants";
import { typeRoleMerge } from "@reddb-io/design-system/base/recipes";

/** Token-only layout around the canonical Popover and Combobox appearances. */
export const commandPalette = tv({
  slots: {
    root: "isolate min-w-0 text-foreground",
    content: [
      "w-[min(32rem,calc(100vw-2rem))]",
      "p-[var(--reddb-spatial-inset-md)]",
    ].join(" "),
    search: "min-w-0",
    list: "mt-[var(--reddb-spatial-gap-sm)] max-h-[50dvh] overflow-y-auto",
    group: "grid gap-[var(--reddb-spatial-gap-sm)]",
    heading: "px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)] text-caption text-ink-muted",
    identity: "flex min-w-0 flex-1 flex-col text-start",
    description: "text-caption text-ink-muted break-words group-data-[highlighted]/command:text-foreground",
    keys: "flex shrink-0 flex-wrap gap-[var(--reddb-spatial-gap-sm)]",
  },
}, typeRoleMerge);

export type CommandPaletteVariants = VariantProps<typeof commandPalette>;
