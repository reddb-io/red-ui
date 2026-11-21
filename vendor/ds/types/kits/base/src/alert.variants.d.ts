import { type VariantProps } from "tailwind-variants";
import { type Tone } from "./tone";
/** Every tone an Alert accepts: the shared vocabulary. */
export declare const ALERT_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
export type AlertTone = Tone;
export declare const alert: import("tailwind-variants").TVReturnType<{
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", string>;
}, undefined, string, {
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", string>;
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    tone: Record<"neutral" | "info" | "success" | "warning" | "danger", string>;
}, undefined>>;
export type AlertVariants = VariantProps<typeof alert>;
