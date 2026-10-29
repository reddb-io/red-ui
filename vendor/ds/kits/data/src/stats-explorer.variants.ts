/** Shared presentation for the native statistics explorer implementations. */
export const statsExplorerClasses = {
  root: "@container flex h-full w-full min-h-0 min-w-0 flex-col text-foreground",
  toolbar: "flex flex-wrap items-center gap-[var(--reddb-spatial-gap-md)] border-b border-muted p-[var(--reddb-spatial-inset-sm)]",
  content: "min-h-0 flex-1 overflow-auto p-[var(--reddb-spatial-inset-md)]",
  grid: "grid grid-cols-1 gap-[var(--reddb-spatial-gap-md)] @md:grid-cols-2 @xl:grid-cols-3",
  gauge: "min-w-0 rounded-lg border border-muted bg-transparent p-[var(--reddb-spatial-inset-md)] text-center",
  svg: "mx-auto aspect-[12/7] w-full",
};
