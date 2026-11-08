import { type VariantProps } from "tailwind-variants";
export declare const fileInput: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            field?: import("tailwind-variants").ClassValue;
            filename?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            field?: import("tailwind-variants").ClassValue;
            filename?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    field: string;
    control: string;
    filename: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            field?: import("tailwind-variants").ClassValue;
            filename?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    field: string;
    control: string;
    filename: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    field: string;
    control: string;
    filename: string;
}>>;
export type FileInputVariants = VariantProps<typeof fileInput>;
