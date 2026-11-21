import { type VariantProps } from "tailwind-variants";
export declare const emptyState: import("tailwind-variants").TVReturnType<{
    size: {
        readonly sm: {
            readonly root: "gap-[var(--reddb-spatial-gap-md)] px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-lg)]";
            readonly title: "text-label";
            readonly description: "text-caption";
            readonly hint: "text-caption";
        };
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)] px-[var(--reddb-spatial-inset-lg)] py-10";
            readonly title: "text-heading";
            readonly description: "text-body";
            readonly hint: "text-caption";
        };
    };
    bordered: {
        readonly true: {
            readonly root: "border-dashed border-muted";
        };
        readonly false: {
            readonly root: "border-transparent";
        };
    };
}, {
    root: string;
    media: string;
    title: string;
    description: string;
    hint: string;
    actions: string;
}, undefined, {
    size: {
        readonly sm: {
            readonly root: "gap-[var(--reddb-spatial-gap-md)] px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-lg)]";
            readonly title: "text-label";
            readonly description: "text-caption";
            readonly hint: "text-caption";
        };
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)] px-[var(--reddb-spatial-inset-lg)] py-10";
            readonly title: "text-heading";
            readonly description: "text-body";
            readonly hint: "text-caption";
        };
    };
    bordered: {
        readonly true: {
            readonly root: "border-dashed border-muted";
        };
        readonly false: {
            readonly root: "border-transparent";
        };
    };
}, {
    root: string;
    media: string;
    title: string;
    description: string;
    hint: string;
    actions: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        readonly sm: {
            readonly root: "gap-[var(--reddb-spatial-gap-md)] px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-lg)]";
            readonly title: "text-label";
            readonly description: "text-caption";
            readonly hint: "text-caption";
        };
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)] px-[var(--reddb-spatial-inset-lg)] py-10";
            readonly title: "text-heading";
            readonly description: "text-body";
            readonly hint: "text-caption";
        };
    };
    bordered: {
        readonly true: {
            readonly root: "border-dashed border-muted";
        };
        readonly false: {
            readonly root: "border-transparent";
        };
    };
}, {
    root: string;
    media: string;
    title: string;
    description: string;
    hint: string;
    actions: string;
}>>;
export type EmptyStateVariants = VariantProps<typeof emptyState>;
export type EmptyStateSize = NonNullable<EmptyStateVariants["size"]>;
export declare const EMPTY_STATE_SIZES: readonly EmptyStateSize[];
