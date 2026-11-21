/**
 * Icon sizes shared by native adapters. `sm`/`md`/`lg` are Density-owned, for a
 * glyph alone in a control; `text` follows the label it sits beside (ADR 0054),
 * reading the glyph size `glyphLabel` sets, or `1em` outside one.
 */
export declare const ICON_SIZES: readonly ["sm", "md", "lg", "text"];
export type IconSize = (typeof ICON_SIZES)[number];
/** Semantic ink roles accepted by Icon. */
export declare const ICON_COLORS: readonly ["current", "foreground", "ink-muted", "primary", "on-primary", "feedback-danger-foreground", "feedback-success-foreground", "feedback-warning-foreground", "feedback-info-foreground"];
export type IconColor = (typeof ICON_COLORS)[number];
/** Resolve a semantic role to the CSS color the glyph strokes with. */
export declare function iconColor(role: IconColor): string;
/** Density controls glyph dimensions independently of the control hit area. */
export declare function iconDimension(size: IconSize): string;
