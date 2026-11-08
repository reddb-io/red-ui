import { type VariantProps } from "tailwind-variants";
export declare const dropdownMenu: import("tailwind-variants").TVReturnType<{
    size: {
        sm: {
            item: string;
            icon: string;
        };
        md: {
            item: string;
            icon: string;
        };
        lg: {
            item: string;
            icon: string;
        };
    };
}, {
    content: string;
    group: string;
    heading: string;
    separator: string;
    item: string;
    icon: string;
    label: string;
    shortcut: string;
}, undefined, {
    size: {
        sm: {
            item: string;
            icon: string;
        };
        md: {
            item: string;
            icon: string;
        };
        lg: {
            item: string;
            icon: string;
        };
    };
}, {
    content: string;
    group: string;
    heading: string;
    separator: string;
    item: string;
    icon: string;
    label: string;
    shortcut: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: {
            item: string;
            icon: string;
        };
        md: {
            item: string;
            icon: string;
        };
        lg: {
            item: string;
            icon: string;
        };
    };
}, {
    content: string;
    group: string;
    heading: string;
    separator: string;
    item: string;
    icon: string;
    label: string;
    shortcut: string;
}>>;
export type DropdownMenuVariants = VariantProps<typeof dropdownMenu>;
export type DropdownMenuSize = NonNullable<DropdownMenuVariants["size"]>;
export declare const DROPDOWN_MENU_SIZES: readonly ["sm", "md", "lg"];
