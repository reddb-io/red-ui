import { type VariantProps } from "tailwind-variants";
export declare const table: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            caption?: import("tailwind-variants").ClassValue;
            header?: import("tailwind-variants").ClassValue;
            head?: import("tailwind-variants").ClassValue;
            cell?: import("tailwind-variants").ClassValue;
            row?: import("tailwind-variants").ClassValue;
            table?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            caption?: import("tailwind-variants").ClassValue;
            header?: import("tailwind-variants").ClassValue;
            head?: import("tailwind-variants").ClassValue;
            cell?: import("tailwind-variants").ClassValue;
            row?: import("tailwind-variants").ClassValue;
            table?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    table: string;
    caption: string;
    header: string;
    row: string;
    head: string;
    cell: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            caption?: import("tailwind-variants").ClassValue;
            header?: import("tailwind-variants").ClassValue;
            head?: import("tailwind-variants").ClassValue;
            cell?: import("tailwind-variants").ClassValue;
            row?: import("tailwind-variants").ClassValue;
            table?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    table: string;
    caption: string;
    header: string;
    row: string;
    head: string;
    cell: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    table: string;
    caption: string;
    header: string;
    row: string;
    head: string;
    cell: string;
}>>;
export type TableVariants = VariantProps<typeof table>;
