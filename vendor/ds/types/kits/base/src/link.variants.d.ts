import { type VariantProps } from "tailwind-variants";
/**
 * Native-link appearance with a persistent non-colour affordance.
 *
 * A link is ink, not accent: foreground text carrying the underline, which
 * thickens on hover. The Brand red is reserved for the primary action — and in
 * the light scheme it is the same red as danger, so a red link would read as an
 * error (DESIGN.md, "Interactive states").
 */
export declare const link: import("tailwind-variants").TVReturnType<{} | {} | {}, undefined, string, {} | {}, undefined, import("tailwind-variants").TVReturnTypeLike<unknown, undefined>>;
export type LinkVariants = VariantProps<typeof link>;
