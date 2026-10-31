import { tv } from "tailwind-variants";
import { typeRoleMerge } from "@reddb-io/design-system/base/recipes";
export const workspaceTabsAppearance = tv(
  {
    slots: {
      root: "@container/workspace-tabs flex min-h-0 flex-col min-w-0 text-foreground",
      frame:
        "grid min-w-0 max-w-full overflow-x-auto border-b border-elevation-base-border bg-elevation-sunken-surface",
      list: "col-span-full row-start-1 grid min-w-0 grid-cols-subgrid",
      trigger:
        "relative flex min-h-[var(--reddb-spatial-control-height-md)] max-w-[calc(var(--reddb-spatial-control-height-md)*8)] min-w-[var(--reddb-spatial-target-min)] items-center justify-start gap-[var(--reddb-spatial-gap-sm)] rounded-t-[var(--reddb-radius-sm)] border-e border-e-elevation-base-border border-b-2 border-b-transparent px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)] text-body text-start whitespace-nowrap aria-selected:border-foreground aria-selected:bg-foreground/10 aria-selected:font-medium disabled:opacity-50",
      status: "inline-flex shrink-0 items-center text-caption text-ink-muted",
      close:
        "relative z-10 pointer-events-none row-start-1 flex items-center justify-self-end self-stretch",
      closeButton:
        "pointer-events-auto w-[var(--reddb-spatial-control-height-sm)] min-w-[var(--reddb-spatial-target-min)]",
      panel:
        "min-h-0 min-w-0 flex-1 p-[var(--reddb-spatial-inset-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      empty: "m-0 p-[var(--reddb-spatial-inset-md)] text-body text-ink-muted",
    },
    variants: {
      withClose: {
        true: {
          trigger: "pe-[var(--reddb-spatial-control-height-sm)]",
        },
      },
    },
  },
  typeRoleMerge,
);
