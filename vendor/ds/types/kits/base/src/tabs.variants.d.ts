import { type VariantProps } from "tailwind-variants";
export interface TabItem {
    value: string;
    label: string;
    disabled?: boolean;
}
export declare const tabs: import("tailwind-variants").TVReturnType<{
    size: {
        sm: {
            trigger: string;
        };
        md: {
            trigger: string;
        };
        lg: {
            trigger: string;
        };
    };
    overflow: {
        wrap: {};
        scroll: {
            list: string;
            trigger: string;
        };
    };
}, {
    root: string;
    bar: string;
    list: string;
    trigger: string;
    content: string;
}, undefined, {
    size: {
        sm: {
            trigger: string;
        };
        md: {
            trigger: string;
        };
        lg: {
            trigger: string;
        };
    };
    overflow: {
        wrap: {};
        scroll: {
            list: string;
            trigger: string;
        };
    };
}, {
    root: string;
    bar: string;
    list: string;
    trigger: string;
    content: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: {
            trigger: string;
        };
        md: {
            trigger: string;
        };
        lg: {
            trigger: string;
        };
    };
    overflow: {
        wrap: {};
        scroll: {
            list: string;
            trigger: string;
        };
    };
}, {
    root: string;
    bar: string;
    list: string;
    trigger: string;
    content: string;
}>>;
export type TabsVariants = VariantProps<typeof tabs>;
/** A Tabs' height step: Button's and the fields' `sm | md | lg`. */
export type TabsSize = NonNullable<TabsVariants["size"]>;
export declare const TABS_SIZES: readonly ["sm", "md", "lg"];
