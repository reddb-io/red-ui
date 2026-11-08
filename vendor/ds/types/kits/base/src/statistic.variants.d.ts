import { type VariantProps } from "tailwind-variants";
export declare const statistic: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            value?: import("tailwind-variants").ClassValue;
            detail?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            value?: import("tailwind-variants").ClassValue;
            detail?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    detail: string;
    value: string;
    description: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            value?: import("tailwind-variants").ClassValue;
            detail?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    detail: string;
    value: string;
    description: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    detail: string;
    value: string;
    description: string;
}>>;
export type StatisticVariants = VariantProps<typeof statistic>;
