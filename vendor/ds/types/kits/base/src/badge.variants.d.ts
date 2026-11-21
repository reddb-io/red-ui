import { type VariantProps } from "tailwind-variants";
import type { Tone } from "./tone";
/** How strongly a Badge's tone is drawn — its emphasis axis. */
export declare const BADGE_VARIANTS: readonly ["tinted", "filled", "outline"];
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
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
}, undefined>>;
export type BadgeVariants = VariantProps<typeof badge>;
export type BadgeTone = Tone;
