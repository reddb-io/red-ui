/** Density-owned icon sizes shared by native adapters. */
export declare const ICON_SIZES: readonly ["sm", "md", "lg"];
export type IconSize = (typeof ICON_SIZES)[number];
/** Semantic ink roles accepted by Icon. */
export declare const ICON_COLORS: readonly ["current", "foreground", "ink-muted", "primary", "on-primary", "feedback-danger-foreground", "feedback-success-foreground", "feedback-warning-foreground", "feedback-info-foreground"];
export type IconColor = (typeof ICON_COLORS)[number];
/** @deprecated Use ink-muted; muted is a surface role. */
export type DeprecatedIconColor = "muted";
/** Resolve a semantic role, including the retained deprecated alias. */
export declare function iconColor(color: IconColor | DeprecatedIconColor): string;
/** Density controls glyph dimensions independently of the control hit area. */
export declare function iconDimension(size: IconSize): string;
