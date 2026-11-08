import { type VariantProps } from "tailwind-variants";
export declare const descriptionList: import("tailwind-variants").TVReturnType<{
    gap: {
        sm: {
            root: "gap-[var(--reddb-spatial-gap-sm)]";
            item: "gap-[var(--reddb-spatial-gap-sm)]";
        };
        md: {
            root: "gap-[var(--reddb-spatial-gap-md)]";
            item: "gap-[var(--reddb-spatial-gap-md)]";
        };
        lg: {
            root: "gap-[var(--reddb-spatial-gap-lg)]";
            item: "gap-[var(--reddb-spatial-gap-lg)]";
        };
    };
}, {
    root: string;
    item: string;
    term: string;
    detail: string;
}, undefined, {
    gap: {
        sm: {
            root: "gap-[var(--reddb-spatial-gap-sm)]";
            item: "gap-[var(--reddb-spatial-gap-sm)]";
        };
        md: {
            root: "gap-[var(--reddb-spatial-gap-md)]";
            item: "gap-[var(--reddb-spatial-gap-md)]";
        };
        lg: {
            root: "gap-[var(--reddb-spatial-gap-lg)]";
            item: "gap-[var(--reddb-spatial-gap-lg)]";
        };
    };
}, {
    root: string;
    item: string;
    term: string;
    detail: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    gap: {
        sm: {
            root: "gap-[var(--reddb-spatial-gap-sm)]";
            item: "gap-[var(--reddb-spatial-gap-sm)]";
        };
        md: {
            root: "gap-[var(--reddb-spatial-gap-md)]";
            item: "gap-[var(--reddb-spatial-gap-md)]";
        };
        lg: {
            root: "gap-[var(--reddb-spatial-gap-lg)]";
            item: "gap-[var(--reddb-spatial-gap-lg)]";
        };
    };
}, {
    root: string;
    item: string;
    term: string;
    detail: string;
}>>;
export type DescriptionListVariants = VariantProps<typeof descriptionList>;
export type DescriptionListGap = NonNullable<DescriptionListVariants["gap"]>;
export declare const DESCRIPTION_LIST_GAPS: readonly DescriptionListGap[];
