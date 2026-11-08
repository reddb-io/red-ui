/** The axis the panes are laid out along. */
export declare const SPLIT_ORIENTATIONS: readonly ["horizontal", "vertical"];
export type SplitOrientation = (typeof SPLIT_ORIENTATIONS)[number];
/** How much of the container the start pane may take. */
export interface SplitBounds {
    /** Smallest fraction the start pane may shrink to. */
    min: number;
    /** Largest fraction it may grow to. */
    max: number;
}
/**
 * The default bounds. Neither pane can go below a tenth: a pane dragged to
 * zero looks like a bug in the application rather than a position of the
 * divider, and nothing in the DOM would tell a user it is still there.
 */
export declare const SPLIT_BOUNDS: SplitBounds;
/** How far one arrow key press moves the divider. */
export declare const SPLIT_STEP = 0.02;
/**
 * `fraction`, held inside `bounds`.
 *
 * A fraction that is not a finite number is a caller's bug, and it resolves to
 * the midpoint rather than propagating: `NaN` would reach the DOM as a style
 * the browser drops, leaving a split that is silently unsplit.
 */
export declare function clampFraction(fraction: number, bounds?: SplitBounds): number;
/**
 * The fraction a pointer `offset` from the container's leading edge means,
 * given the container's `size` along the same axis.
 *
 * `null` when the container has no measurable size — which is what a hidden
 * container, or one measured before layout, gives back. A drag that cannot be
 * measured must leave the divider where it is, not slam it to an edge.
 */
export declare function fractionAt(offset: number, size: number, bounds?: SplitBounds): number | null;
/**
 * The fraction `key` moves the divider to, or `null` when the key means
 * nothing here.
 *
 * `null` is the important half: the keys of the other axis, and every key that
 * is not a movement, have to reach the page. A separator that swallowed every
 * arrow would take the page's scrolling with it.
 */
export declare function fractionForKey(key: string, fraction: number, orientation: SplitOrientation, bounds?: SplitBounds, step?: number): number | null;
/** `0.425` -> `"42.5%"`, at a tenth of a percent — enough for a pixel either way. */
export declare function percentOf(fraction: number): string;
/**
 * The separator's own orientation, which is the opposite of the split's: panes
 * side by side are divided by a vertical rule. ARIA names the separator, not
 * the layout, so this is a translation and not a synonym.
 */
export declare function separatorOrientation(orientation: SplitOrientation): SplitOrientation;
