import type { ComboboxOption } from "./combobox.variants";
export interface SearchSelectOption extends ComboboxOption {
    /** Supporting text shown beneath the option label and included in search. */
    description?: string;
    /** Additional caller-owned search terms, such as codes or aliases. */
    keywords?: readonly string[];
}
/** Accent-insensitive search over labels, descriptions and explicit aliases. */
export declare function searchSelectOptions(options: readonly SearchSelectOption[], query: string): readonly SearchSelectOption[];
export declare const searchSelect: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            search?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            empty?: import("tailwind-variants").ClassValue;
            row?: import("tailwind-variants").ClassValue;
            summary?: import("tailwind-variants").ClassValue;
            option?: import("tailwind-variants").ClassValue;
            placeholder?: import("tailwind-variants").ClassValue;
            chips?: import("tailwind-variants").ClassValue;
            chip?: import("tailwind-variants").ClassValue;
            clear?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            search?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            empty?: import("tailwind-variants").ClassValue;
            row?: import("tailwind-variants").ClassValue;
            summary?: import("tailwind-variants").ClassValue;
            option?: import("tailwind-variants").ClassValue;
            placeholder?: import("tailwind-variants").ClassValue;
            chips?: import("tailwind-variants").ClassValue;
            chip?: import("tailwind-variants").ClassValue;
            clear?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    row: string;
    trigger: string;
    summary: string;
    placeholder: string;
    content: string;
    search: string;
    list: string;
    item: string;
    option: string;
    description: string;
    empty: string;
    chips: string;
    chip: string;
    clear: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            item?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
            list?: import("tailwind-variants").ClassValue;
            search?: import("tailwind-variants").ClassValue;
            description?: import("tailwind-variants").ClassValue;
            empty?: import("tailwind-variants").ClassValue;
            row?: import("tailwind-variants").ClassValue;
            summary?: import("tailwind-variants").ClassValue;
            option?: import("tailwind-variants").ClassValue;
            placeholder?: import("tailwind-variants").ClassValue;
            chips?: import("tailwind-variants").ClassValue;
            chip?: import("tailwind-variants").ClassValue;
            clear?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    row: string;
    trigger: string;
    summary: string;
    placeholder: string;
    content: string;
    search: string;
    list: string;
    item: string;
    option: string;
    description: string;
    empty: string;
    chips: string;
    chip: string;
    clear: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    row: string;
    trigger: string;
    summary: string;
    placeholder: string;
    content: string;
    search: string;
    list: string;
    item: string;
    option: string;
    description: string;
    empty: string;
    chips: string;
    chip: string;
    clear: string;
}>>;
