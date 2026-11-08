import { type VariantProps } from "tailwind-variants";
export declare const slider: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            output?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            output?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    control: string;
    output: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            output?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    control: string;
    output: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    control: string;
    output: string;
}>>;
export type SliderVariants = VariantProps<typeof slider>;
