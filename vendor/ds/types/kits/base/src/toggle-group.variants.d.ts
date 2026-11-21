import { type VariantProps } from "tailwind-variants";
export interface ToggleGroupOption {
    value: string;
    label: string;
    disabled?: boolean;
}
export declare const toggleGroup: import("tailwind-variants").TVReturnType<{
    size: {
        sm: {
            list: string;
            option: string;
        };
        md: {
            list: string;
            option: string;
        };
        lg: {
            list: string;
            option: string;
        };
    };
    invalid: {
        true: {
            list: string;
        };
    };
    overflow: {
        scroll: {
            list: string;
        };
        wrap: {
            list: string;
            option: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
}, undefined, {
    size: {
        sm: {
            list: string;
            option: string;
        };
        md: {
            list: string;
            option: string;
        };
        lg: {
            list: string;
            option: string;
        };
    };
    invalid: {
        true: {
            list: string;
        };
    };
    overflow: {
        scroll: {
            list: string;
        };
        wrap: {
            list: string;
            option: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: {
            list: string;
            option: string;
        };
        md: {
            list: string;
            option: string;
        };
        lg: {
            list: string;
            option: string;
        };
    };
    invalid: {
        true: {
            list: string;
        };
    };
    overflow: {
        scroll: {
            list: string;
        };
        wrap: {
            list: string;
            option: string;
        };
    };
}, {
    root: string;
    list: string;
    option: string;
}>>;
export declare const TOGGLE_GROUP_OVERFLOWS: readonly ["scroll", "wrap"];
export type ToggleGroupOverflow = (typeof TOGGLE_GROUP_OVERFLOWS)[number];
export type ToggleGroupVariants = VariantProps<typeof toggleGroup>;
/** A ToggleGroup's height step: Button's and the fields' `sm | md | lg`. */
export type ToggleGroupSize = NonNullable<ToggleGroupVariants["size"]>;
export declare const TOGGLE_GROUP_SIZES: readonly ["sm", "md", "lg"];
