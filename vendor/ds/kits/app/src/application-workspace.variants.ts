import { tv } from "tailwind-variants";

/** Container-responsive workspace regions, independent of host viewport. */
export const applicationWorkspace = tv({
  slots: {
    root: "@container/application-workspace flex min-h-0 min-w-0 w-full flex-wrap items-stretch text-foreground",
    navigation: "min-h-0 min-w-0 basis-full overflow-auto bg-elevation-sunken-surface border-b border-elevation-base-border @3xl/application-workspace:basis-1/4 @3xl/application-workspace:border-b-0 @3xl/application-workspace:border-e",
    content: "flex min-h-0 min-w-0 basis-full flex-col @3xl/application-workspace:grow @3xl/application-workspace:basis-0",
    toolbar: "min-w-0",
  },
});
