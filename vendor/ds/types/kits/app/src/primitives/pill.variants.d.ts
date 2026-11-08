import { type Tone } from "@reddb-io/design-system/base/recipes";
import { type VariantProps } from "tailwind-variants";
/** How strongly a Pill's tone is drawn — its emphasis axis. */
export declare const PILL_VARIANTS: readonly ["tinted", "filled", "outline"];
export type PillVariant = (typeof PILL_VARIANTS)[number];
/** The tones a Pill accepts: the shared vocabulary (ADR 0026). */
export declare const PILL_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
export type PillTone = Tone;
/**
 * Variant values kept for one release (ADR 0026). `neutral` is the tinted
 * neutral pill it always drew; `primary` keeps its accent fill and warns — a
 * meaning is a tone (`tone="info" variant="filled"`), never the accent.
 */
export declare const DEPRECATED_PILL_VARIANTS: {
    readonly neutral: "tinted";
    readonly primary: "filled";
};
/** @deprecated `neutral` is `variant="tinted"`; `primary` is a filled tone. Removed next release. */
export type DeprecatedPillVariant = keyof typeof DEPRECATED_PILL_VARIANTS;
declare const SIZE: {
    readonly sm: "px-2.5 py-0.5 text-xs";
    readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-sm";
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
        readonly neutral: "";
        readonly primary: "";
    };
    size: {
        readonly sm: "px-2.5 py-0.5 text-xs";
        readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-sm";
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
        readonly neutral: "";
        readonly primary: "";
    };
    size: {
        readonly sm: "px-2.5 py-0.5 text-xs";
        readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-sm";
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
        readonly neutral: "";
        readonly primary: "";
    };
    size: {
        readonly sm: "px-2.5 py-0.5 text-xs";
        readonly md: "px-[var(--reddb-spatial-inset-sm)] py-1 text-sm";
    };
}, undefined>>;
/**
 * The dismiss affordance, styled to inherit the Pill's own colour. The glyph
 * stays small, but its hit area is a control-height-sm square centred on it,
 * so the target never drops below 24px (WCAG 2.2 SC 2.5.8). Its rest, hover,
 * pressed and focus states are the quiet-control contract the component wraps
 * it in (wave 6A).
 */
export declare const pillDismiss: import("tailwind-variants").TVReturnType<{} | {} | {}, undefined, string, {} | {}, undefined, import("tailwind-variants").TVReturnTypeLike<unknown, undefined>>;
export type PillVariants = VariantProps<typeof pill>;
export type PillSize = keyof typeof SIZE;
export declare const PILL_SIZES: readonly PillSize[];
export {};
