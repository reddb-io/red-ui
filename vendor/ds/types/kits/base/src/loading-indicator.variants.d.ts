import { type VariantProps } from "tailwind-variants";
export declare const loadingIndicator: import("tailwind-variants").TVReturnType<{
    size: {
        readonly sm: {
            readonly root: string;
            readonly label: "text-caption";
        };
        readonly md: {
            readonly root: string;
            readonly label: "text-body";
        };
        readonly lg: {
            readonly root: string;
            readonly label: "text-base";
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
        false: {
            label: string;
            spinner: string;
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
            readonly root: string;
            readonly label: "text-caption";
        };
        readonly md: {
            readonly root: string;
            readonly label: "text-body";
        };
        readonly lg: {
            readonly root: string;
            readonly label: "text-base";
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
        false: {
            label: string;
            spinner: string;
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
            readonly root: string;
            readonly label: "text-caption";
        };
        readonly md: {
            readonly root: string;
            readonly label: "text-body";
        };
        readonly lg: {
            readonly root: string;
            readonly label: "text-base";
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
        false: {
            label: string;
            spinner: string;
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
