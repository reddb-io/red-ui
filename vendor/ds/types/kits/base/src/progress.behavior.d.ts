/** A finite, ordered range shared by every value-based feedback capability. */
export interface NormalizedRange {
    min: number;
    max: number;
    value: number;
    /** Current position in the range, from zero through one hundred. */
    percent: number;
}
/** True only when a progress value can be announced as determinate. */
export declare function isDeterminate(value: number | null | undefined): value is number;
/**
 * Make native range input safe for rendering and accessibility attributes.
 * A reversed or collapsed range becomes one unit wide; a value is clamped.
 */
export declare function normalizeRange(value: number, min?: number, max?: number): NormalizedRange;
/** The default audible and visible rendering of a normalized progress value. */
export declare function formatPercent(range: NormalizedRange): string;
