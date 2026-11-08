import { type VariantProps } from "tailwind-variants";
/** Token-only layout around the canonical Popover and Combobox appearances. */
export declare const commandPalette: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            heading?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            search?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            keys?: import("tailwind-variants").ClassValue;
            group?: import("tailwind-variants").ClassValue;
            identity?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            heading?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            search?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            keys?: import("tailwind-variants").ClassValue;
            group?: import("tailwind-variants").ClassValue;
            identity?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    content: string;
    search: string;
    list: string;
    group: string;
    heading: string;
    identity: string;
    description: string;
    keys: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            heading?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            search?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            keys?: import("tailwind-variants").ClassValue;
            group?: import("tailwind-variants").ClassValue;
            identity?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    content: string;
    search: string;
    list: string;
    group: string;
    heading: string;
    identity: string;
    description: string;
    keys: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    content: string;
    search: string;
    list: string;
    group: string;
    heading: string;
    identity: string;
    description: string;
    keys: string;
}>>;
export type CommandPaletteVariants = VariantProps<typeof commandPalette>;
