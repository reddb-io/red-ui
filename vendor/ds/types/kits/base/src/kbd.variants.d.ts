import { type VariantProps } from "tailwind-variants";
/** Key-cap size follows its surrounding typography, not page Density. */
export declare const kbd: import("tailwind-variants").TVReturnType<{
    size: {
        readonly sm: "h-4 min-w-4 px-1 text-xs";
        readonly md: "h-5 min-w-5 px-1.5 text-xs";
    };
}, undefined, "inline-flex items-center justify-center rounded-sm border border-muted bg-transparent font-mono leading-tight text-foreground whitespace-nowrap", {
    size: {
        readonly sm: "h-4 min-w-4 px-1 text-xs";
        readonly md: "h-5 min-w-5 px-1.5 text-xs";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        readonly sm: "h-4 min-w-4 px-1 text-xs";
        readonly md: "h-5 min-w-5 px-1.5 text-xs";
    };
}, undefined>>;
/** A multi-key chord; only the inter-cap gap routes through Density. */
export declare const kbdChord: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    separator: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            separator?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    separator: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    separator: string;
}>>;
export type KbdVariants = VariantProps<typeof kbd>;
export type KbdSize = NonNullable<KbdVariants["size"]>;
export declare const KBD_SIZES: readonly KbdSize[];
