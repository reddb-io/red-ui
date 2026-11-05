/** Shared token-backed presentation for both developer panel adapters. */
export const developerPanelClasses = {
  root: "@container inset-x-0 bottom-0 z-40 flex flex-col border-t border-control-edge bg-elevation-base-surface text-foreground shadow-xl",
  toolbar: "flex min-h-[var(--reddb-spatial-control-height-md)] flex-wrap items-center gap-[var(--reddb-spatial-gap-sm)] border-b border-muted px-[var(--reddb-spatial-inset-md)]",
  content: "grid h-[min(45vh,32rem)] min-h-0 grid-cols-1 overflow-auto @lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)]",
  list: "min-h-0 min-w-0 overflow-auto border-b border-muted @lg:border-b-0 @lg:border-r",
  detail: "min-h-0 min-w-0 overflow-auto p-[var(--reddb-spatial-inset-md)]",
  row: "flex w-full min-w-0 items-center gap-[var(--reddb-spatial-gap-sm)] border-b border-muted p-[var(--reddb-spatial-inset-sm)] text-left",
  tabs: "flex flex-wrap items-center gap-[var(--reddb-spatial-gap-sm)] border-b border-muted",
  text: "min-w-0 whitespace-pre-wrap break-words font-mono text-caption",
  muted: "text-ink-muted",
  cell: "break-all px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)] text-left align-top",
  stack: "flex flex-col gap-[var(--reddb-spatial-gap-md)]",
};
