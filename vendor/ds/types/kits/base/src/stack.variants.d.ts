import { type VariantProps } from "tailwind-variants";
export declare const stack: import("tailwind-variants").TVReturnType<{
    direction: {
        readonly column: "flex-col";
        readonly row: "flex-row";
    };
    gap: {
        readonly none: "gap-0";
        readonly sm: "gap-[var(--reddb-spatial-gap-sm)]";
        readonly md: "gap-[var(--reddb-spatial-gap-md)]";
        readonly lg: "gap-[var(--reddb-spatial-gap-lg)]";
        readonly "layout-sm": "gap-[var(--reddb-spatial-layout-gap-sm)]";
        readonly "layout-md": "gap-[var(--reddb-spatial-layout-gap-md)]";
        readonly "layout-lg": "gap-[var(--reddb-spatial-layout-gap-lg)]";
        readonly section: "gap-[var(--reddb-spatial-section-gap)]";
    };
    align: {
        readonly stretch: "";
        readonly start: "items-start";
        readonly center: "items-center";
        readonly end: "items-end";
        readonly baseline: "items-baseline";
    };
    justify: {
        readonly start: "";
        readonly center: "justify-center";
        readonly end: "justify-end";
        readonly between: "justify-between";
    };
    wrap: {
        readonly true: "flex-wrap";
        readonly false: "";
    };
}, undefined, "flex", {
    direction: {
        readonly column: "flex-col";
        readonly row: "flex-row";
    };
    gap: {
        readonly none: "gap-0";
        readonly sm: "gap-[var(--reddb-spatial-gap-sm)]";
        readonly md: "gap-[var(--reddb-spatial-gap-md)]";
        readonly lg: "gap-[var(--reddb-spatial-gap-lg)]";
        readonly "layout-sm": "gap-[var(--reddb-spatial-layout-gap-sm)]";
        readonly "layout-md": "gap-[var(--reddb-spatial-layout-gap-md)]";
        readonly "layout-lg": "gap-[var(--reddb-spatial-layout-gap-lg)]";
        readonly section: "gap-[var(--reddb-spatial-section-gap)]";
    };
    align: {
        readonly stretch: "";
        readonly start: "items-start";
        readonly center: "items-center";
        readonly end: "items-end";
        readonly baseline: "items-baseline";
    };
    justify: {
        readonly start: "";
        readonly center: "justify-center";
        readonly end: "justify-end";
        readonly between: "justify-between";
    };
    wrap: {
        readonly true: "flex-wrap";
        readonly false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    direction: {
        readonly column: "flex-col";
        readonly row: "flex-row";
    };
    gap: {
        readonly none: "gap-0";
        readonly sm: "gap-[var(--reddb-spatial-gap-sm)]";
        readonly md: "gap-[var(--reddb-spatial-gap-md)]";
        readonly lg: "gap-[var(--reddb-spatial-gap-lg)]";
        readonly "layout-sm": "gap-[var(--reddb-spatial-layout-gap-sm)]";
        readonly "layout-md": "gap-[var(--reddb-spatial-layout-gap-md)]";
        readonly "layout-lg": "gap-[var(--reddb-spatial-layout-gap-lg)]";
        readonly section: "gap-[var(--reddb-spatial-section-gap)]";
    };
    align: {
        readonly stretch: "";
        readonly start: "items-start";
        readonly center: "items-center";
        readonly end: "items-end";
        readonly baseline: "items-baseline";
    };
    justify: {
        readonly start: "";
        readonly center: "justify-center";
        readonly end: "justify-end";
        readonly between: "justify-between";
    };
    wrap: {
        readonly true: "flex-wrap";
        readonly false: "";
    };
}, undefined>>;
export type StackVariants = VariantProps<typeof stack>;
export type StackGap = NonNullable<StackVariants["gap"]>;
export type StackDirection = NonNullable<StackVariants["direction"]>;
export type StackAlign = NonNullable<StackVariants["align"]>;
export type StackJustify = NonNullable<StackVariants["justify"]>;
export declare const STACK_GAPS: readonly StackGap[];
export declare const STACK_DIRECTIONS: readonly StackDirection[];
export declare const STACK_ALIGNMENTS: readonly StackAlign[];
export declare const STACK_JUSTIFICATIONS: readonly StackJustify[];
