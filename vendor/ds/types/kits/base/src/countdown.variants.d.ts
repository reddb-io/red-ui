import { type VariantProps } from "tailwind-variants";
export declare const countdown: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            label?: import("tailwind-variants").ClassValue;
            value?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            label?: import("tailwind-variants").ClassValue;
            value?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    label: string;
    value: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            label?: import("tailwind-variants").ClassValue;
            value?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    label: string;
    value: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    label: string;
    value: string;
}>>;
export type CountdownVariants = VariantProps<typeof countdown>;
