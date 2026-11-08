import { type VariantProps } from "tailwind-variants";
export declare const list: import("tailwind-variants").TVReturnType<{
    gap: {
        readonly sm: "gap-[var(--reddb-spatial-gap-sm)]";
        readonly md: "gap-[var(--reddb-spatial-gap-md)]";
        readonly lg: "gap-[var(--reddb-spatial-gap-lg)]";
    };
}, undefined, "flex flex-col", {
    gap: {
        readonly sm: "gap-[var(--reddb-spatial-gap-sm)]";
        readonly md: "gap-[var(--reddb-spatial-gap-md)]";
        readonly lg: "gap-[var(--reddb-spatial-gap-lg)]";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    gap: {
        readonly sm: "gap-[var(--reddb-spatial-gap-sm)]";
        readonly md: "gap-[var(--reddb-spatial-gap-md)]";
        readonly lg: "gap-[var(--reddb-spatial-gap-lg)]";
    };
}, undefined>>;
export type ListVariants = VariantProps<typeof list>;
export type ListGap = NonNullable<ListVariants["gap"]>;
export declare const LIST_GAPS: readonly ListGap[];
