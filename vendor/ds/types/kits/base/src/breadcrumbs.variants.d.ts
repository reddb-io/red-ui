import { type VariantProps } from "tailwind-variants";
export declare const breadcrumbs: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            current?: import("tailwind-variants").ClassValue;
            link?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            current?: import("tailwind-variants").ClassValue;
            link?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    list: string;
    item: string;
    current: string;
    link: string;
    separator: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            current?: import("tailwind-variants").ClassValue;
            link?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    list: string;
    item: string;
    current: string;
    link: string;
    separator: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    list: string;
    item: string;
    current: string;
    link: string;
    separator: string;
}>>;
export type BreadcrumbsVariants = VariantProps<typeof breadcrumbs>;
