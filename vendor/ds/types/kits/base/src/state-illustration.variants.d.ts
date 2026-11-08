import { type VariantProps } from "tailwind-variants";
/** Density-owned artwork bounds; the SVG's own viewBox keeps its aspect ratio. */
export declare const stateIllustration: import("tailwind-variants").TVReturnType<{
    size: {
        sm: "w-[calc(var(--reddb-spatial-control-height-md)*5)]";
        md: "w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        lg: "w-[calc(var(--reddb-spatial-control-height-md)*12)]";
        full: "w-full";
    };
}, undefined, "block h-auto max-w-full shrink-0", {
    size: {
        sm: "w-[calc(var(--reddb-spatial-control-height-md)*5)]";
        md: "w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        lg: "w-[calc(var(--reddb-spatial-control-height-md)*12)]";
        full: "w-full";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: "w-[calc(var(--reddb-spatial-control-height-md)*5)]";
        md: "w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        lg: "w-[calc(var(--reddb-spatial-control-height-md)*12)]";
        full: "w-full";
    };
}, undefined>>;
export type StateIllustrationSize = NonNullable<VariantProps<typeof stateIllustration>["size"]>;
export declare const STATE_ILLUSTRATION_SIZES: readonly ["sm", "md", "lg", "full"];
