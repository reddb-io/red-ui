import { type VariantProps } from "tailwind-variants";
export type { FieldsetControlProps } from "./core/fieldset";
export declare const fieldset: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            help?: import("tailwind-variants").ClassValue;
            error?: import("tailwind-variants").ClassValue;
            legend?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            help?: import("tailwind-variants").ClassValue;
            error?: import("tailwind-variants").ClassValue;
            legend?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    legend: string;
    help: string;
    error: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            help?: import("tailwind-variants").ClassValue;
            error?: import("tailwind-variants").ClassValue;
            legend?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    legend: string;
    help: string;
    error: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    legend: string;
    help: string;
    error: string;
}>>;
export type FieldsetVariants = VariantProps<typeof fieldset>;
