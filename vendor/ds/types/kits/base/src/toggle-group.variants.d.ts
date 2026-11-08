import { type VariantProps } from "tailwind-variants";
export interface ToggleGroupOption {
    value: string;
    label: string;
    disabled?: boolean;
}
export declare const toggleGroup: import("tailwind-variants").TVReturnType<{
    invalid: {
        true: {
            list: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
}, undefined, {
    invalid: {
        true: {
            list: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    invalid: {
        true: {
            list: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
}>>;
export type ToggleGroupVariants = VariantProps<typeof toggleGroup>;
