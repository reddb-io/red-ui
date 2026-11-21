import { type VariantProps } from "tailwind-variants";
export declare const hitArea: import("tailwind-variants").TVReturnType<{
    axis: {
        /** Both dimensions reach the floor: a glyph-only or dismiss control. */
        both: "before:h-full before:min-h-[var(--reddb-spatial-target-min)] before:w-full before:min-w-[var(--reddb-spatial-target-min)]";
        /** Only the block size: an inline link whose width is its words. */
        block: "before:h-[var(--reddb-spatial-target-min)] before:w-full";
    };
}, undefined, "relative before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']", {
    axis: {
        /** Both dimensions reach the floor: a glyph-only or dismiss control. */
        both: "before:h-full before:min-h-[var(--reddb-spatial-target-min)] before:w-full before:min-w-[var(--reddb-spatial-target-min)]";
        /** Only the block size: an inline link whose width is its words. */
        block: "before:h-[var(--reddb-spatial-target-min)] before:w-full";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    axis: {
        /** Both dimensions reach the floor: a glyph-only or dismiss control. */
        both: "before:h-full before:min-h-[var(--reddb-spatial-target-min)] before:w-full before:min-w-[var(--reddb-spatial-target-min)]";
        /** Only the block size: an inline link whose width is its words. */
        block: "before:h-[var(--reddb-spatial-target-min)] before:w-full";
    };
}, undefined>>;
export type HitAreaVariants = VariantProps<typeof hitArea>;
