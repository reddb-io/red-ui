import { type VariantProps } from "tailwind-variants";
export declare const numberField: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            input?: import("tailwind-variants").ClassValue;
            step?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            input?: import("tailwind-variants").ClassValue;
            step?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    input: string;
    step: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            input?: import("tailwind-variants").ClassValue;
            step?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    input: string;
    step: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    input: string;
    step: string;
}>>;
export type NumberFieldVariants = VariantProps<typeof numberField>;
