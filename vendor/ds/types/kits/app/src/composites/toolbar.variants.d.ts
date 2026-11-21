import { type VariantProps } from "tailwind-variants";
export declare const toolbar: import("tailwind-variants").TVReturnType<{
    orientation: {
        horizontal: "";
        vertical: {
            root: string;
        };
    };
    size: {
        sm: {
            item: string;
        };
        md: {
            item: string;
        };
        lg: {
            item: string;
        };
    };
    overflow: {
        wrap: "";
        collapse: "";
    };
}, {
    root: string;
    item: string;
    more: string;
}, undefined, {
    orientation: {
        horizontal: "";
        vertical: {
            root: string;
        };
    };
    size: {
        sm: {
            item: string;
        };
        md: {
            item: string;
        };
        lg: {
            item: string;
        };
    };
    overflow: {
        wrap: "";
        collapse: "";
    };
}, {
    root: string;
    item: string;
    more: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    orientation: {
        horizontal: "";
        vertical: {
            root: string;
        };
    };
    size: {
        sm: {
            item: string;
        };
        md: {
            item: string;
        };
        lg: {
            item: string;
        };
    };
    overflow: {
        wrap: "";
        collapse: "";
    };
}, {
    root: string;
    item: string;
    more: string;
}>>;
export type ToolbarVariants = VariantProps<typeof toolbar>;
export type ToolbarSize = NonNullable<ToolbarVariants["size"]>;
export type ToolbarOverflow = NonNullable<ToolbarVariants["overflow"]>;
