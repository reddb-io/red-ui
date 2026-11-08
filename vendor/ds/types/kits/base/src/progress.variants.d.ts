import { type VariantProps } from "tailwind-variants";
export declare const progress: import("tailwind-variants").TVReturnType<{
    tone: {
        neutral: {
            indicator: "bg-foreground";
        };
        info: {
            indicator: "bg-feedback-info-foreground";
        };
        success: {
            indicator: "bg-feedback-success-foreground";
        };
        warning: {
            indicator: "bg-feedback-warning-foreground";
        };
        danger: {
            indicator: "bg-feedback-danger-foreground";
        };
    };
    indeterminate: {
        true: {
            indicator: string;
        };
        false: {
            indicator: string;
        };
    };
}, {
    root: string;
    summary: string;
    label: string;
    value: string;
    track: string;
    indicator: string;
}, undefined, {
    tone: {
        neutral: {
            indicator: "bg-foreground";
        };
        info: {
            indicator: "bg-feedback-info-foreground";
        };
        success: {
            indicator: "bg-feedback-success-foreground";
        };
        warning: {
            indicator: "bg-feedback-warning-foreground";
        };
        danger: {
            indicator: "bg-feedback-danger-foreground";
        };
    };
    indeterminate: {
        true: {
            indicator: string;
        };
        false: {
            indicator: string;
        };
    };
}, {
    root: string;
    summary: string;
    label: string;
    value: string;
    track: string;
    indicator: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    tone: {
        neutral: {
            indicator: "bg-foreground";
        };
        info: {
            indicator: "bg-feedback-info-foreground";
        };
        success: {
            indicator: "bg-feedback-success-foreground";
        };
        warning: {
            indicator: "bg-feedback-warning-foreground";
        };
        danger: {
            indicator: "bg-feedback-danger-foreground";
        };
    };
    indeterminate: {
        true: {
            indicator: string;
        };
        false: {
            indicator: string;
        };
    };
}, {
    root: string;
    summary: string;
    label: string;
    value: string;
    track: string;
    indicator: string;
}>>;
export type ProgressVariants = VariantProps<typeof progress>;
