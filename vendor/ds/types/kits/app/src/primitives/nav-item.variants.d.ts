import { type VariantProps } from "tailwind-variants";
export declare const navItem: import("tailwind-variants").TVReturnType<{
    current: {
        /** Where you are. */
        readonly true: {
            readonly root: "border-foreground bg-state-selected font-medium text-foreground";
        };
        /** Everywhere else you could go. */
        readonly false: {
            readonly root: "border-transparent bg-transparent text-ink-muted";
        };
    };
    disabled: {
        /** Present, visibly unavailable, and unreachable by pointer or by tab. */
        readonly true: {
            readonly root: "pointer-events-none opacity-50";
        };
        readonly false: {
            readonly root: "";
        };
    };
}, {
    root: string;
    icon: string;
    label: string;
    trailing: string;
}, undefined, {
    current: {
        /** Where you are. */
        readonly true: {
            readonly root: "border-foreground bg-state-selected font-medium text-foreground";
        };
        /** Everywhere else you could go. */
        readonly false: {
            readonly root: "border-transparent bg-transparent text-ink-muted";
        };
    };
    disabled: {
        /** Present, visibly unavailable, and unreachable by pointer or by tab. */
        readonly true: {
            readonly root: "pointer-events-none opacity-50";
        };
        readonly false: {
            readonly root: "";
        };
    };
}, {
    root: string;
    icon: string;
    label: string;
    trailing: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    current: {
        /** Where you are. */
        readonly true: {
            readonly root: "border-foreground bg-state-selected font-medium text-foreground";
        };
        /** Everywhere else you could go. */
        readonly false: {
            readonly root: "border-transparent bg-transparent text-ink-muted";
        };
    };
    disabled: {
        /** Present, visibly unavailable, and unreachable by pointer or by tab. */
        readonly true: {
            readonly root: "pointer-events-none opacity-50";
        };
        readonly false: {
            readonly root: "";
        };
    };
}, {
    root: string;
    icon: string;
    label: string;
    trailing: string;
}>>;
export type NavItemVariants = VariantProps<typeof navItem>;
