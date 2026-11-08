import { type VariantProps } from "tailwind-variants";
export declare const sectionHeading: import("tailwind-variants").TVReturnType<{
    size: {
        readonly sm: {
            readonly title: "text-base font-medium leading-tight";
        };
        readonly md: {
            readonly title: "text-lg font-medium leading-tight";
        };
        readonly lg: {
            readonly title: "text-2xl font-medium leading-tight";
        };
        readonly display: {
            readonly title: "text-display";
            readonly description: "text-lg";
        };
    };
    rule: {
        readonly true: {
            readonly root: "border-b border-muted pb-[var(--reddb-spatial-inset-sm)]";
        };
        readonly false: {
            readonly root: "border-b border-transparent pb-0";
        };
    };
}, {
    root: string;
    group: string;
    leading: string;
    text: string;
    title: string;
    description: string;
    actions: string;
}, undefined, {
    size: {
        readonly sm: {
            readonly title: "text-base font-medium leading-tight";
        };
        readonly md: {
            readonly title: "text-lg font-medium leading-tight";
        };
        readonly lg: {
            readonly title: "text-2xl font-medium leading-tight";
        };
        readonly display: {
            readonly title: "text-display";
            readonly description: "text-lg";
        };
    };
    rule: {
        readonly true: {
            readonly root: "border-b border-muted pb-[var(--reddb-spatial-inset-sm)]";
        };
        readonly false: {
            readonly root: "border-b border-transparent pb-0";
        };
    };
}, {
    root: string;
    group: string;
    leading: string;
    text: string;
    title: string;
    description: string;
    actions: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        readonly sm: {
            readonly title: "text-base font-medium leading-tight";
        };
        readonly md: {
            readonly title: "text-lg font-medium leading-tight";
        };
        readonly lg: {
            readonly title: "text-2xl font-medium leading-tight";
        };
        readonly display: {
            readonly title: "text-display";
            readonly description: "text-lg";
        };
    };
    rule: {
        readonly true: {
            readonly root: "border-b border-muted pb-[var(--reddb-spatial-inset-sm)]";
        };
        readonly false: {
            readonly root: "border-b border-transparent pb-0";
        };
    };
}, {
    root: string;
    group: string;
    leading: string;
    text: string;
    title: string;
    description: string;
    actions: string;
}>>;
export type SectionHeadingVariants = VariantProps<typeof sectionHeading>;
export type SectionHeadingSize = NonNullable<SectionHeadingVariants["size"]>;
export declare const SECTION_HEADING_SIZES: readonly SectionHeadingSize[];
export declare const SECTION_HEADING_LEVELS: readonly [1, 2, 3, 4, 5, 6];
export type SectionHeadingLevel = (typeof SECTION_HEADING_LEVELS)[number];
