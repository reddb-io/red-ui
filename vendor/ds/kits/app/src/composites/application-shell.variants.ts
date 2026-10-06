import { tv, type VariantProps } from "tailwind-variants";

/**
 * The application frame's structural appearance. Every inset names a live
 * Density role; colour names remain semantic so nested appearance scopes keep
 * deciding what the shell looks like.
 */
export const applicationShell = tv({
  slots: {
    root: "flex min-h-dvh w-full flex-col bg-elevation-base-surface text-foreground",
    header: "shrink-0 border-b border-elevation-sunken-border bg-elevation-sunken-surface shadow-elevation-sunken",
    headerContainer: "py-[var(--reddb-spatial-inset-sm)]",
    main: "min-h-0 flex-1 bg-elevation-base-surface",
    mainContainer: "py-[var(--reddb-spatial-inset-lg)]",
    footer: "shrink-0 border-t border-elevation-sunken-border bg-elevation-sunken-surface shadow-elevation-sunken",
    footerContainer: "py-[var(--reddb-spatial-inset-sm)]",
  },
});

export type ApplicationShellVariants = VariantProps<typeof applicationShell>;
