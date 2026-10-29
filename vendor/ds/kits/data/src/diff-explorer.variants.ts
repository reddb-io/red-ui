/** Shared presentation for the native change explorer implementations. */
export const explorerClasses = {
  root: "flex h-full w-full min-h-0 min-w-0 flex-col text-foreground",
  toolbar: "flex flex-wrap items-center gap-[var(--reddb-spatial-gap-md)] border-b border-muted p-[var(--reddb-spatial-inset-sm)]",
  content: "grid min-h-0 flex-1 grid-cols-1 overflow-auto @lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
  list: "min-w-0 overflow-auto border-b border-muted @lg:border-b-0 @lg:border-r",
  detail: "flex min-w-0 flex-col gap-[var(--reddb-spatial-gap-sm)] overflow-auto p-[var(--reddb-spatial-inset-md)]",
  row: "flex w-full flex-wrap items-center gap-[var(--reddb-spatial-gap-md)] border-b border-muted p-[var(--reddb-spatial-inset-sm)] text-left",
  raw: "min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-[var(--reddb-spatial-inset-md)] font-mono",
  cell: "px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)] align-top",
  value: "min-w-0 whitespace-pre-wrap break-words font-mono",
  select: "min-h-[var(--reddb-spatial-control-height-sm)] max-w-full rounded-sm border border-control-edge bg-background px-[var(--reddb-spatial-inset-sm)] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  coordinateTrack: "h-[var(--reddb-spatial-inset-sm)] w-full overflow-hidden rounded-sm bg-muted",
  coordinateBar: "h-full bg-primary",
  muted: "text-ink-muted",
};
