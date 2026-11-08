import { type VariantProps } from "tailwind-variants";
export declare const scrollArea: import("tailwind-variants").TVReturnType<{
    orientation: {
        readonly vertical: "overflow-x-hidden overflow-y-auto";
        readonly horizontal: "overflow-x-auto overflow-y-hidden";
        readonly both: "overflow-auto";
    };
    variant: {
        outline: "rounded-md border border-muted bg-background p-[var(--reddb-spatial-inset-sm)]";
        plain: "p-0 focus-visible:-outline-offset-2";
    };
}, undefined, string, {
    orientation: {
        readonly vertical: "overflow-x-hidden overflow-y-auto";
        readonly horizontal: "overflow-x-auto overflow-y-hidden";
        readonly both: "overflow-auto";
    };
    variant: {
        outline: "rounded-md border border-muted bg-background p-[var(--reddb-spatial-inset-sm)]";
        plain: "p-0 focus-visible:-outline-offset-2";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    orientation: {
        readonly vertical: "overflow-x-hidden overflow-y-auto";
        readonly horizontal: "overflow-x-auto overflow-y-hidden";
        readonly both: "overflow-auto";
    };
    variant: {
        outline: "rounded-md border border-muted bg-background p-[var(--reddb-spatial-inset-sm)]";
        plain: "p-0 focus-visible:-outline-offset-2";
    };
}, undefined>>;
export type ScrollAreaVariants = VariantProps<typeof scrollArea>;
export type ScrollAreaOrientation = NonNullable<ScrollAreaVariants["orientation"]>;
export declare const SCROLL_AREA_ORIENTATIONS: readonly ScrollAreaOrientation[];
