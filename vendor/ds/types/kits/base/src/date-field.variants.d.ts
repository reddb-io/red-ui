import { type VariantProps } from "tailwind-variants";
export declare const dateField: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
            segments?: import("tailwind-variants").ClassValue;
            segment?: import("tailwind-variants").ClassValue;
            year?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
            segments?: import("tailwind-variants").ClassValue;
            segment?: import("tailwind-variants").ClassValue;
            year?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    segments: string;
    year: string;
    segment: string;
    separator: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
            segments?: import("tailwind-variants").ClassValue;
            segment?: import("tailwind-variants").ClassValue;
            year?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    segments: string;
    year: string;
    segment: string;
    separator: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    segments: string;
    year: string;
    segment: string;
    separator: string;
}>>;
export type DateFieldVariants = VariantProps<typeof dateField>;
