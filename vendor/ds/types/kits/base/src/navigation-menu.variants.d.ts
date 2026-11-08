import { type VariantProps } from "tailwind-variants";
export declare const navigationMenu: import("tailwind-variants").TVReturnType<{
    orientation: {
        horizontal: {
            list: string;
            control: string;
        };
        vertical: {
            list: string;
            control: string;
        };
    };
    size: {
        sm: {
            control: string;
        };
        md: {
            control: string;
        };
        lg: {
            control: string;
        };
    };
}, {
    root: string;
    list: string;
    control: string;
    content: string;
    links: string;
    link: string;
    description: string;
}, undefined, {
    orientation: {
        horizontal: {
            list: string;
            control: string;
        };
        vertical: {
            list: string;
            control: string;
        };
    };
    size: {
        sm: {
            control: string;
        };
        md: {
            control: string;
        };
        lg: {
            control: string;
        };
    };
}, {
    root: string;
    list: string;
    control: string;
    content: string;
    links: string;
    link: string;
    description: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    orientation: {
        horizontal: {
            list: string;
            control: string;
        };
        vertical: {
            list: string;
            control: string;
        };
    };
    size: {
        sm: {
            control: string;
        };
        md: {
            control: string;
        };
        lg: {
            control: string;
        };
    };
}, {
    root: string;
    list: string;
    control: string;
    content: string;
    links: string;
    link: string;
    description: string;
}>>;
export type NavigationMenuVariants = VariantProps<typeof navigationMenu>;
export type NavigationMenuOrientation = NonNullable<NavigationMenuVariants["orientation"]>;
export type NavigationMenuSize = NonNullable<NavigationMenuVariants["size"]>;
