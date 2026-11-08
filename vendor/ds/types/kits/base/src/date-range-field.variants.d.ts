import { type VariantProps } from "tailwind-variants";
export declare const dateRangeField: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            help?: import("tailwind-variants").ClassValue;
            error?: import("tailwind-variants").ClassValue;
            frame?: import("tailwind-variants").ClassValue;
            fields?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            help?: import("tailwind-variants").ClassValue;
            error?: import("tailwind-variants").ClassValue;
            frame?: import("tailwind-variants").ClassValue;
            fields?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    frame: string;
    fields: string;
    help: string;
    error: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            help?: import("tailwind-variants").ClassValue;
            error?: import("tailwind-variants").ClassValue;
            frame?: import("tailwind-variants").ClassValue;
            fields?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    frame: string;
    fields: string;
    help: string;
    error: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    frame: string;
    fields: string;
    help: string;
    error: string;
}>>;
export type DateRangeFieldVariants = VariantProps<typeof dateRangeField>;
