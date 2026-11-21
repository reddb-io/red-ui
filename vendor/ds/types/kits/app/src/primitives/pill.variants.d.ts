import { type Tone } from "@reddb-io/design-system/base/recipes";
import { type VariantProps } from "tailwind-variants";
/** How strongly a Pill's tone is drawn — its emphasis axis. */
export declare const PILL_VARIANTS: readonly ["tinted", "filled", "outline"];
export type PillVariant = (typeof PILL_VARIANTS)[number];
/** The tones a Pill accepts: the shared vocabulary (ADR 0026). */
export declare const PILL_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
export type PillTone = Tone;
declare const SIZE: {
    readonly sm: "px-2.5 py-0.5 text-caption";
    readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-body";
};
export declare const pill: import("tailwind-variants").TVReturnType<{
    tone: {
        readonly neutral: "";
        readonly info: "";
        readonly success: "";
        readonly warning: "";
        readonly danger: "";
    };
    variant: {
        readonly tinted: "";
        readonly filled: "";
        readonly outline: "";
    };
    size: {
        readonly sm: "px-2.5 py-0.5 text-caption";
        readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-body";
    };
}, undefined, "inline-flex items-center gap-1.5 rounded-full border leading-tight whitespace-nowrap", {
    tone: {
        readonly neutral: "";
        readonly info: "";
        readonly success: "";
        readonly warning: "";
        readonly danger: "";
    };
    variant: {
        readonly tinted: "";
        readonly filled: "";
        readonly outline: "";
    };
    size: {
        readonly sm: "px-2.5 py-0.5 text-caption";
        readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-body";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    tone: {
        readonly neutral: "";
        readonly info: "";
        readonly success: "";
        readonly warning: "";
        readonly danger: "";
    };
    variant: {
        readonly tinted: "";
        readonly filled: "";
        readonly outline: "";
    };
    size: {
        readonly sm: "px-2.5 py-0.5 text-caption";
        readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-body";
    };
}, undefined>>;
/**
 * The dismiss affordance, styled to inherit the Pill's own colour. The glyph
 * stays small, but its hit area is the target floor centred on it (`hitArea`,
 * ADR 0054): 24px under a fine pointer (WCAG 2.2 SC 2.5.8), 44px under a
 * coarse one (ADR 0022). Its rest, hover,
 * pressed and focus states are the quiet-control contract the component wraps
 * it in (wave 6A).
 */
export declare const pillDismiss: import("tailwind-variants").TVReturnType<{} | {} | {}, undefined, string, {} | {}, undefined, import("tailwind-variants").TVReturnTypeLike<unknown, undefined>>;
export type PillVariants = VariantProps<typeof pill>;
export type PillSize = keyof typeof SIZE;
export declare const PILL_SIZES: readonly PillSize[];
export {};
