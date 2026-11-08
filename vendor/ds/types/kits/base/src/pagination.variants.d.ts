import { type VariantProps } from "tailwind-variants";
export declare const pagination: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            page?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            page?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    list: string;
    page: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            page?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    list: string;
    page: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    list: string;
    page: string;
}>>;
export type PaginationVariants = VariantProps<typeof pagination>;
