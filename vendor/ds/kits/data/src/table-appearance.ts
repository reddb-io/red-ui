/** Shared grid geometry and materials for both framework implementations. */
export const dataTableClasses = {
  root: "flex min-h-0 min-w-0 flex-col gap-[var(--reddb-spatial-layout-gap-sm)] text-foreground",
  tools: "flex shrink-0 flex-wrap items-end gap-[var(--reddb-spatial-layout-gap-sm)] rounded-md border border-elevation-base-border bg-elevation-sunken-surface p-[var(--reddb-spatial-inset-sm)]",
  // Native table columns must not enlarge an ancestor's intrinsic inline size.
  // Keep their width inside this scroll region, as the Base Table does.
  scroll: "min-h-0 min-w-0 max-w-full flex-1 overflow-auto rounded-md border border-elevation-base-border bg-background [contain:inline-size] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  header: "sticky top-0 z-10 bg-elevation-sunken-surface text-foreground",
  head: "border-b border-elevation-base-border border-e border-e-elevation-base-border last:border-e-0",
  row: "border-b border-elevation-base-border last:border-b-0",
  cell: "border-e border-elevation-base-border last:border-e-0",
};

/** Explorer chrome has its own bands; it never recolors the grid's content. */
export const tableExplorerClasses = {
  root: "flex h-full w-full min-h-0 min-w-0 flex-col bg-background text-foreground",
  toolbar: "flex shrink-0 flex-wrap items-center gap-[var(--reddb-spatial-gap-md)] border-b border-elevation-base-border bg-elevation-sunken-surface px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)] text-caption",
  filters: "grid max-h-[25%] shrink-0 overflow-auto grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-[var(--reddb-spatial-gap-md)] border-b border-elevation-base-border bg-elevation-sunken-surface p-[var(--reddb-spatial-inset-md)]",
  filter: "grid min-w-0 gap-[var(--reddb-spatial-gap-sm)] text-caption text-ink-muted",
  grid: "min-h-0 flex-1 overflow-hidden p-[var(--reddb-spatial-inset-sm)]",
  footer: "m-0 shrink-0 border-t border-elevation-base-border bg-elevation-sunken-surface px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)] text-caption text-ink-muted",
};
