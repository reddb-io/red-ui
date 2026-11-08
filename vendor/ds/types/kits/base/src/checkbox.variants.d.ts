import { type VariantProps } from "tailwind-variants";
/**
 * The drawn box every native choice shares: Checkbox squares it and adds the
 * mixed fill, RadioGroup rounds it. The mixed fill stays Checkbox's alone — a
 * radio matches `:indeterminate` whenever its group has no choice yet.
 */
export declare const choiceBox: string;
export declare const checkbox: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            box?: import("tailwind-variants").ClassValue;
            mark?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            box?: import("tailwind-variants").ClassValue;
            mark?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    control: string;
    box: string;
    mark: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            box?: import("tailwind-variants").ClassValue;
            mark?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    control: string;
    box: string;
    mark: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    control: string;
    box: string;
    mark: string;
}>>;
export type CheckboxVariants = VariantProps<typeof checkbox>;
