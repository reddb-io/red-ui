import { type VariantProps } from "tailwind-variants";
/** Token-only rail appearance; SidebarRail.svelte owns focus and selection emission. */
export declare const sidebarRail: import("tailwind-variants").TVReturnType<{
    labelled: {
        false: {};
        true: {
            root: string;
            item: string;
            face: string;
            badgeAnchor: string;
            region: string;
            list: string;
        };
    };
}, {
    root: string;
    region: string;
    middle: string;
    badgeAnchor: string;
    statusAnchor: string;
    badge: string;
    face: string;
    label: string;
    divider: string;
    list: string;
    item: string;
    fallback: string;
}, undefined, {
    labelled: {
        false: {};
        true: {
            root: string;
            item: string;
            face: string;
            badgeAnchor: string;
            region: string;
            list: string;
        };
    };
}, {
    root: string;
    region: string;
    middle: string;
    badgeAnchor: string;
    statusAnchor: string;
    badge: string;
    face: string;
    label: string;
    divider: string;
    list: string;
    item: string;
    fallback: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    labelled: {
        false: {};
        true: {
            root: string;
            item: string;
            face: string;
            badgeAnchor: string;
            region: string;
            list: string;
        };
    };
}, {
    root: string;
    region: string;
    middle: string;
    badgeAnchor: string;
    statusAnchor: string;
    badge: string;
    face: string;
    label: string;
    divider: string;
    list: string;
    item: string;
    fallback: string;
}>>;
export type SidebarRailVariants = VariantProps<typeof sidebarRail>;
