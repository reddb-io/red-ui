import { type VariantProps } from "tailwind-variants";
export declare const DIVIDER_ORIENTATIONS: readonly ["horizontal", "vertical"];
export type DividerOrientation = (typeof DIVIDER_ORIENTATIONS)[number];
export declare const divider: import("tailwind-variants").TVReturnType<{
    orientation: {
        horizontal: "my-[var(--reddb-spatial-gap-sm)] h-px w-full";
        vertical: "mx-[var(--reddb-spatial-gap-sm)] h-full w-px self-stretch";
    };
}, undefined, "shrink-0 bg-muted", {
    orientation: {
        horizontal: "my-[var(--reddb-spatial-gap-sm)] h-px w-full";
        vertical: "mx-[var(--reddb-spatial-gap-sm)] h-full w-px self-stretch";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    orientation: {
        horizontal: "my-[var(--reddb-spatial-gap-sm)] h-px w-full";
        vertical: "mx-[var(--reddb-spatial-gap-sm)] h-full w-px self-stretch";
    };
}, undefined>>;
export type DividerVariants = VariantProps<typeof divider>;
