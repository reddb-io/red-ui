import { type VariantProps } from "tailwind-variants";
import { type Tone } from "./tone";
/** The tones a StatusIndicator accepts: the shared vocabulary (ADR 0026). */
export declare const STATUS_INDICATOR_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
export type StatusIndicatorTone = Tone;
/** @deprecated StatusIndicator's meaning is `tone` (ADR 0026); use `STATUS_INDICATOR_TONES`. Removed next release. */
export declare const STATUS_INDICATOR_STATUSES: readonly ["neutral", "info", "success", "warning", "danger"];
/** @deprecated StatusIndicator's meaning is `tone` (ADR 0026); use `StatusIndicatorTone`. Removed next release. */
export type StatusIndicatorStatus = Tone;
export declare const statusIndicator: import("tailwind-variants").TVReturnType<{
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", {
        mark: string;
    }>;
    labelled: {
        true: {
            label: string;
        };
        false: {
            label: string;
        };
    };
}, {
    root: string;
    mark: string;
    label: string;
}, undefined, {
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", {
        mark: string;
    }>;
    labelled: {
        true: {
            label: string;
        };
        false: {
            label: string;
        };
    };
}, {
    root: string;
    mark: string;
    label: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", {
        mark: string;
    }>;
    labelled: {
        true: {
            label: string;
        };
        false: {
            label: string;
        };
    };
}, {
    root: string;
    mark: string;
    label: string;
}>>;
export type StatusIndicatorVariants = VariantProps<typeof statusIndicator>;
