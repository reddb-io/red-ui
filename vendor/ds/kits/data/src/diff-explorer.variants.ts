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
  muted: "text-ink-muted",
};
