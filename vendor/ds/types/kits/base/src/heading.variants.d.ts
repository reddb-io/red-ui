import { type VariantProps } from "tailwind-variants";
export declare const heading: import("tailwind-variants").TVReturnType<{
    role: {
        readonly display: "text-display";
        readonly title: "text-title";
        readonly heading: "text-heading";
    };
}, undefined, "text-foreground text-balance", {
    role: {
        readonly display: "text-display";
        readonly title: "text-title";
        readonly heading: "text-heading";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    role: {
        readonly display: "text-display";
        readonly title: "text-title";
        readonly heading: "text-heading";
    };
}, undefined>>;
export type HeadingVariants = VariantProps<typeof heading>;
export type HeadingRole = NonNullable<HeadingVariants["role"]>;
export declare const HEADING_ROLES: readonly HeadingRole[];
export declare const HEADING_LEVELS: readonly [1, 2, 3, 4, 5, 6];
export type HeadingLevel = (typeof HEADING_LEVELS)[number];
/** The role a level reads as when none is chosen: a page title, then section headings. */
export declare function defaultHeadingRole(level: HeadingLevel): HeadingRole;
