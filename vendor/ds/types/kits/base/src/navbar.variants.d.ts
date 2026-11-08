import { type VariantProps } from "tailwind-variants";
export declare const navbar: import("tailwind-variants").TVReturnType<{
    align: {
        readonly start: {
            readonly brand: "shrink-0";
            readonly links: "grow justify-start";
            readonly actions: "ms-auto shrink-0 justify-end";
        };
        readonly center: {
            readonly brand: "grow basis-0 justify-start";
            readonly links: "shrink-0 justify-center";
            readonly actions: "grow basis-0 justify-end";
        };
    };
    collapse: {
        readonly responsive: {
            readonly rail: "hidden @3xl/navbar:flex";
            readonly compact: "flex @3xl/navbar:hidden";
            readonly panel: "@3xl/navbar:hidden";
        };
        readonly expanded: {
            readonly rail: "flex";
            readonly compact: "hidden";
            readonly panel: "hidden";
        };
        readonly collapsed: {
            readonly rail: "hidden";
            readonly compact: "flex";
            readonly panel: "";
        };
    };
    open: {
        readonly true: {
            readonly panel: "flex";
        };
        readonly false: {
            readonly panel: "hidden";
        };
    };
}, {
    root: string;
    rail: string;
    compact: string;
    brand: string;
    links: string;
    item: string;
    actions: string;
    link: string;
    panelLink: string;
    toggle: string;
    panel: string;
    panelLinks: string;
}, undefined, {
    align: {
        readonly start: {
            readonly brand: "shrink-0";
            readonly links: "grow justify-start";
            readonly actions: "ms-auto shrink-0 justify-end";
        };
        readonly center: {
            readonly brand: "grow basis-0 justify-start";
            readonly links: "shrink-0 justify-center";
            readonly actions: "grow basis-0 justify-end";
        };
    };
    collapse: {
        readonly responsive: {
            readonly rail: "hidden @3xl/navbar:flex";
            readonly compact: "flex @3xl/navbar:hidden";
            readonly panel: "@3xl/navbar:hidden";
        };
        readonly expanded: {
            readonly rail: "flex";
            readonly compact: "hidden";
            readonly panel: "hidden";
        };
        readonly collapsed: {
            readonly rail: "hidden";
            readonly compact: "flex";
            readonly panel: "";
        };
    };
    open: {
        readonly true: {
            readonly panel: "flex";
        };
        readonly false: {
            readonly panel: "hidden";
        };
    };
}, {
    root: string;
    rail: string;
    compact: string;
    brand: string;
    links: string;
    item: string;
    actions: string;
    link: string;
    panelLink: string;
    toggle: string;
    panel: string;
    panelLinks: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    align: {
        readonly start: {
            readonly brand: "shrink-0";
            readonly links: "grow justify-start";
            readonly actions: "ms-auto shrink-0 justify-end";
        };
        readonly center: {
            readonly brand: "grow basis-0 justify-start";
            readonly links: "shrink-0 justify-center";
            readonly actions: "grow basis-0 justify-end";
        };
    };
    collapse: {
        readonly responsive: {
            readonly rail: "hidden @3xl/navbar:flex";
            readonly compact: "flex @3xl/navbar:hidden";
            readonly panel: "@3xl/navbar:hidden";
        };
        readonly expanded: {
            readonly rail: "flex";
            readonly compact: "hidden";
            readonly panel: "hidden";
        };
        readonly collapsed: {
            readonly rail: "hidden";
            readonly compact: "flex";
            readonly panel: "";
        };
    };
    open: {
        readonly true: {
            readonly panel: "flex";
        };
        readonly false: {
            readonly panel: "hidden";
        };
    };
}, {
    root: string;
    rail: string;
    compact: string;
    brand: string;
    links: string;
    item: string;
    actions: string;
    link: string;
    panelLink: string;
    toggle: string;
    panel: string;
    panelLinks: string;
}>>;
export type NavbarVariants = VariantProps<typeof navbar>;
