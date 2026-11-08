import { type VariantProps } from "tailwind-variants";
export interface ComboboxOption {
    /** Submitted value for the option. */
    value: string;
    /** Visible text and the text matched by typeahead filtering. */
    label: string;
    /** Removes only this option from interaction and selection. */
    disabled?: boolean;
}
export declare const combobox: import("tailwind-variants").TVReturnType<{
    size: {
        sm: {
            input: string;
            trigger: string;
        };
        md: {
            input: string;
            trigger: string;
        };
        lg: {
            input: string;
            trigger: string;
        };
    };
}, {
    root: string;
    control: string;
    input: string;
    trigger: string;
    content: string;
    item: string;
    indicator: string;
    empty: string;
}, undefined, {
    size: {
        sm: {
            input: string;
            trigger: string;
        };
        md: {
            input: string;
            trigger: string;
        };
        lg: {
            input: string;
            trigger: string;
        };
    };
}, {
    root: string;
    control: string;
    input: string;
    trigger: string;
    content: string;
    item: string;
    indicator: string;
    empty: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: {
            input: string;
            trigger: string;
        };
        md: {
            input: string;
            trigger: string;
        };
        lg: {
            input: string;
            trigger: string;
        };
    };
}, {
    root: string;
    control: string;
    input: string;
    trigger: string;
    content: string;
    item: string;
    indicator: string;
    empty: string;
}>>;
export type ComboboxVariants = VariantProps<typeof combobox>;
export type ComboboxSize = NonNullable<ComboboxVariants["size"]>;
