import { type VariantProps } from "tailwind-variants";
import { type FeedbackTone, type Tone } from "./tone";
/** Every tone an Alert accepts: the shared vocabulary. */
export declare const ALERT_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
export type AlertTone = Tone;
/** @deprecated Alert's meaning is `tone` (ADR 0026); use `FEEDBACK_TONES` or `ALERT_TONES`. Removed next release. */
export declare const ALERT_FEEDBACK_ROLES: readonly ["info", "success", "warning", "danger"];
/** @deprecated Alert's meaning is `tone` (ADR 0026); use `AlertTone`. Removed next release. */
export type AlertFeedbackRole = FeedbackTone;
export declare const alert: import("tailwind-variants").TVReturnType<{
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", string>;
}, undefined, string, {
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", string>;
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", string>;
}, undefined>>;
export type AlertVariants = VariantProps<typeof alert>;
