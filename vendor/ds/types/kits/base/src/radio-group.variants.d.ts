import { type VariantProps } from "tailwind-variants";
export interface RadioGroupOption {
    /** Native submitted value for this choice. */
    value: string;
    /** Caller-owned visible label. */
    label: string;
    /** Supporting text, including the reason an unavailable choice cannot be selected. */
    description?: string;
    /** Removes only this option from interaction and submission. */
    disabled?: boolean;
}
export declare const radioGroup: import("tailwind-variants").TVReturnType<{
    variant: {
        list: {};
        cards: {
            root: string;
            list: string;
            option: string;
            label: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
    choice: string;
    control: string;
    box: string;
    dot: string;
    content: string;
    label: string;
    description: string;
}, undefined, {
    variant: {
        list: {};
        cards: {
            root: string;
            list: string;
            option: string;
            label: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
    choice: string;
    control: string;
    box: string;
    dot: string;
    content: string;
    label: string;
    description: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    variant: {
        list: {};
        cards: {
            root: string;
            list: string;
            option: string;
            label: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
    choice: string;
    control: string;
    box: string;
    dot: string;
    content: string;
    label: string;
    description: string;
}>>;
export type RadioGroupVariants = VariantProps<typeof radioGroup>;
