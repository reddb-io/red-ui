import { type VariantProps } from "tailwind-variants";
export declare const toggleButton: import("tailwind-variants").TVReturnType<{
    pressed: {
        true: "font-medium";
        false: "";
    };
}, undefined, string, {
    pressed: {
        true: "font-medium";
        false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    pressed: {
        true: "font-medium";
        false: "";
    };
}, undefined>>;
export type ToggleButtonVariants = VariantProps<typeof toggleButton>;
