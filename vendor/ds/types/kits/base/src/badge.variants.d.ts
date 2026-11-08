import { type VariantProps } from "tailwind-variants";
import type { Tone } from "./tone";
/** How strongly a Badge's tone is drawn — its emphasis axis. */
export declare const BADGE_VARIANTS: readonly ["tinted", "filled", "outline"];
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
/**
 * Variant values kept for one release (ADR 0026). `neutral` is the tinted
 * neutral badge it always drew; `primary` keeps its accent fill and warns —
 * a status is a tone (`tone="danger" variant="filled"`), never the accent.
 */
export declare const DEPRECATED_BADGE_VARIANTS: {
    readonly neutral: "tinted";
    readonly primary: "filled";
};
/** @deprecated `neutral` is `variant="tinted"`; `primary` is a filled tone. Removed next release. */
export type DeprecatedBadgeVariant = keyof typeof DEPRECATED_BADGE_VARIANTS;
export declare const badge: import("tailwind-variants").TVReturnType<{
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
}, undefined, string, {
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
}, undefined>>;
export type BadgeVariants = VariantProps<typeof badge>;
export type BadgeTone = Tone;
