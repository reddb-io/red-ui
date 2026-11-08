import { type VariantProps } from "tailwind-variants";
export declare const timeline: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            title?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            marker?: import("tailwind-variants").ClassValue;
            time?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            title?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            marker?: import("tailwind-variants").ClassValue;
            time?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    item: string;
    marker: string;
    content: string;
    time: string;
    title: string;
    description: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            title?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            marker?: import("tailwind-variants").ClassValue;
            time?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    item: string;
    marker: string;
    content: string;
    time: string;
    title: string;
    description: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    item: string;
    marker: string;
    content: string;
    time: string;
    title: string;
    description: string;
}>>;
export type TimelineVariants = VariantProps<typeof timeline>;
