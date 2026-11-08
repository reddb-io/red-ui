import { type VariantProps } from "tailwind-variants";
/**
 * The `density` values kept for one release (ADR 0026), and the `size` each
 * one now is.
 */
export declare const DEPRECATED_LIST_ROW_DENSITIES: {
    readonly comfortable: "md";
    readonly compact: "sm";
};
export declare const listRow: import("tailwind-variants").TVReturnType<{
    size: {
        /** The default: a row you can hit with a thumb. */
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)] px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)]";
        };
        /** For long lists where the scan matters more than the target. */
        readonly sm: {
            readonly root: "min-h-[var(--reddb-spatial-control-height-md)] gap-[var(--reddb-spatial-gap-md)] px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-gap-md)]";
        };
    };
    interactive: {
        readonly true: {
            readonly root: "cursor-pointer";
        };
        readonly false: {
            readonly root: "";
        };
    };
    selected: {
        /** The row this list is currently about. */
        readonly true: {
            readonly root: "bg-foreground/10";
            readonly title: "font-medium text-foreground";
        };
        readonly false: {
            readonly root: "";
        };
    };
}, {
    root: string;
    leading: string;
    text: string;
    title: string;
    description: string;
    trailing: string;
}, undefined, {
    size: {
        /** The default: a row you can hit with a thumb. */
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)] px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)]";
        };
        /** For long lists where the scan matters more than the target. */
        readonly sm: {
            readonly root: "min-h-[var(--reddb-spatial-control-height-md)] gap-[var(--reddb-spatial-gap-md)] px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-gap-md)]";
        };
    };
    interactive: {
        readonly true: {
            readonly root: "cursor-pointer";
        };
        readonly false: {
            readonly root: "";
        };
    };
    selected: {
        /** The row this list is currently about. */
        readonly true: {
            readonly root: "bg-foreground/10";
            readonly title: "font-medium text-foreground";
        };
        readonly false: {
            readonly root: "";
        };
    };
}, {
    root: string;
    leading: string;
    text: string;
    title: string;
    description: string;
    trailing: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        /** The default: a row you can hit with a thumb. */
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)] px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)]";
        };
        /** For long lists where the scan matters more than the target. */
        readonly sm: {
            readonly root: "min-h-[var(--reddb-spatial-control-height-md)] gap-[var(--reddb-spatial-gap-md)] px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-gap-md)]";
        };
    };
    interactive: {
        readonly true: {
            readonly root: "cursor-pointer";
        };
        readonly false: {
            readonly root: "";
        };
    };
    selected: {
        /** The row this list is currently about. */
        readonly true: {
            readonly root: "bg-foreground/10";
            readonly title: "font-medium text-foreground";
        };
        readonly false: {
            readonly root: "";
        };
    };
}, {
    root: string;
    leading: string;
    text: string;
    title: string;
    description: string;
    trailing: string;
}>>;
export type ListRowVariants = VariantProps<typeof listRow>;
export type ListRowSize = NonNullable<ListRowVariants["size"]>;
export declare const LIST_ROW_SIZES: readonly ListRowSize[];
/** @deprecated ListRow's scale is `size` (ADR 0026); use `ListRowSize`. Removed next release. */
export type ListRowDensity = keyof typeof DEPRECATED_LIST_ROW_DENSITIES;
/** @deprecated ListRow's scale is `size` (ADR 0026); use `LIST_ROW_SIZES`. Removed next release. */
export declare const LIST_ROW_DENSITIES: readonly ListRowDensity[];
