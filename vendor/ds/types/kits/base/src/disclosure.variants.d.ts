import { type VariantProps } from "tailwind-variants";
export declare const disclosure: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            indicator?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            indicator?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    trigger: string;
    indicator: string;
    content: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            indicator?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    trigger: string;
    indicator: string;
    content: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    trigger: string;
    indicator: string;
    content: string;
}>>;
export type DisclosureVariants = VariantProps<typeof disclosure>;
