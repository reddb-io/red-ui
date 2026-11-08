import { type VariantProps } from "tailwind-variants";
import { type Tone } from "./tone";
/**
 * What a measurement means (ADR 0026): ink by default — a measurement is not
 * an action, so it does not spend the Brand red (DESIGN.md) — or the Feedback
 * Role a threshold reading carries. Shared with Progress and RadialProgress.
 */
export declare const MEASURE_TONE_FILL: {
    readonly neutral: "bg-foreground";
    readonly info: "bg-feedback-info-foreground";
    readonly success: "bg-feedback-success-foreground";
    readonly warning: "bg-feedback-warning-foreground";
    readonly danger: "bg-feedback-danger-foreground";
};
export declare const meter: import("tailwind-variants").TVReturnType<{
    layout: {
        stacked: {};
        inline: {
            root: string;
            summary: string;
            value: string;
            track: string;
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
    };
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
        /** @deprecated The accent is an emphasis, not a tone (ADR 0026); kept one release. */
        primary: {
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
    layout: {
        stacked: {};
        inline: {
            root: string;
            summary: string;
            value: string;
            track: string;
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
    };
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
        /** @deprecated The accent is an emphasis, not a tone (ADR 0026); kept one release. */
        primary: {
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
    layout: {
        stacked: {};
        inline: {
            root: string;
            summary: string;
            value: string;
            track: string;
        };
    };
    labelHidden: {
        true: {
            label: string;
        };
    };
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
        /** @deprecated The accent is an emphasis, not a tone (ADR 0026); kept one release. */
        primary: {
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
export type MeterVariants = VariantProps<typeof meter>;
export type MeterTone = Tone;
/** The tones a Meter accepts: the shared vocabulary (ADR 0026). */
export declare const METER_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
/** @deprecated `primary` is an emphasis, not a tone (ADR 0026). Removed next release. */
export type DeprecatedMeterTone = "primary";
