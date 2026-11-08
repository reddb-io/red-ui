import { type VariantProps } from "tailwind-variants";
export declare const CONTROL_GROUP_ORIENTATIONS: readonly ["horizontal", "vertical"];
export type ControlGroupOrientation = (typeof CONTROL_GROUP_ORIENTATIONS)[number];
export declare const controlGroup: import("tailwind-variants").TVReturnType<{
    orientation: {
        horizontal: "flex-row flex-wrap items-center";
        vertical: "flex-col items-stretch";
    };
}, undefined, "flex gap-[var(--reddb-spatial-gap-sm)]", {
    orientation: {
        horizontal: "flex-row flex-wrap items-center";
        vertical: "flex-col items-stretch";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    orientation: {
        horizontal: "flex-row flex-wrap items-center";
        vertical: "flex-col items-stretch";
    };
}, undefined>>;
export type ControlGroupVariants = VariantProps<typeof controlGroup>;
