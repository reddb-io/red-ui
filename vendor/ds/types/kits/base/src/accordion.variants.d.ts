import { type VariantProps } from "tailwind-variants";
export interface AccordionItem {
    value: string;
    label: string;
    disabled?: boolean;
}
export declare const accordion: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            header?: import("tailwind-variants").ClassValue;
            label?: import("tailwind-variants").ClassValue;
            indicator?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            header?: import("tailwind-variants").ClassValue;
            label?: import("tailwind-variants").ClassValue;
            indicator?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    item: string;
    header: string;
    trigger: string;
    label: string;
    indicator: string;
    content: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            header?: import("tailwind-variants").ClassValue;
            label?: import("tailwind-variants").ClassValue;
            indicator?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    item: string;
    header: string;
    trigger: string;
    label: string;
    indicator: string;
    content: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    item: string;
    header: string;
    trigger: string;
    label: string;
    indicator: string;
    content: string;
}>>;
export type AccordionVariants = VariantProps<typeof accordion>;
