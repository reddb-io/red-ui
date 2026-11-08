import { type VariantProps } from "tailwind-variants";
export declare const loadingIndicator: import("tailwind-variants").TVReturnType<{
    size: {
        readonly sm: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-sm)]";
            readonly label: "text-xs";
        };
        readonly md: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-md)]";
            readonly label: "text-sm";
        };
        readonly lg: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-lg)]";
            readonly label: "text-base";
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
        false: {
            label: string;
        };
    };
}, {
    root: string;
    spinner: string;
    track: string;
    head: string;
    label: string;
}, undefined, {
    size: {
        readonly sm: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-sm)]";
            readonly label: "text-xs";
        };
        readonly md: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-md)]";
            readonly label: "text-sm";
        };
        readonly lg: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-lg)]";
            readonly label: "text-base";
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
        false: {
            label: string;
        };
    };
}, {
    root: string;
    spinner: string;
    track: string;
    head: string;
    label: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        readonly sm: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-sm)]";
            readonly label: "text-xs";
        };
        readonly md: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-md)]";
            readonly label: "text-sm";
        };
        readonly lg: {
            readonly spinner: "size-[var(--reddb-spatial-icon-size-lg)]";
            readonly label: "text-base";
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
        false: {
            label: string;
        };
    };
}, {
    root: string;
    spinner: string;
    track: string;
    head: string;
    label: string;
}>>;
export type LoadingIndicatorVariants = VariantProps<typeof loadingIndicator>;
export type LoadingIndicatorSize = NonNullable<LoadingIndicatorVariants["size"]>;
export declare const LOADING_INDICATOR_SIZES: readonly LoadingIndicatorSize[];
