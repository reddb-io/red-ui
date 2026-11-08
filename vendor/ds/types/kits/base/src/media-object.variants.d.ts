import { type VariantProps } from "tailwind-variants";
export declare const mediaObject: import("tailwind-variants").TVReturnType<{
    align: {
        readonly start: {
            readonly root: "items-start";
        };
        readonly center: {
            readonly root: "items-center";
        };
        readonly end: {
            readonly root: "items-end";
        };
    };
    gap: {
        readonly sm: {
            readonly root: "gap-[var(--reddb-spatial-gap-sm)]";
        };
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-md)]";
        };
        readonly lg: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)]";
        };
    };
}, {
    root: string;
    media: string;
    content: string;
}, undefined, {
    align: {
        readonly start: {
            readonly root: "items-start";
        };
        readonly center: {
            readonly root: "items-center";
        };
        readonly end: {
            readonly root: "items-end";
        };
    };
    gap: {
        readonly sm: {
            readonly root: "gap-[var(--reddb-spatial-gap-sm)]";
        };
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-md)]";
        };
        readonly lg: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)]";
        };
    };
}, {
    root: string;
    media: string;
    content: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    align: {
        readonly start: {
            readonly root: "items-start";
        };
        readonly center: {
            readonly root: "items-center";
        };
        readonly end: {
            readonly root: "items-end";
        };
    };
    gap: {
        readonly sm: {
            readonly root: "gap-[var(--reddb-spatial-gap-sm)]";
        };
        readonly md: {
            readonly root: "gap-[var(--reddb-spatial-gap-md)]";
        };
        readonly lg: {
            readonly root: "gap-[var(--reddb-spatial-gap-lg)]";
        };
    };
}, {
    root: string;
    media: string;
    content: string;
}>>;
export type MediaObjectVariants = VariantProps<typeof mediaObject>;
export type MediaObjectAlign = NonNullable<MediaObjectVariants["align"]>;
export type MediaObjectGap = NonNullable<MediaObjectVariants["gap"]>;
