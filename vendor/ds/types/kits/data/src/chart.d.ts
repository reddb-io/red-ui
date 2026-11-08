/** Pure helpers shared by the Data Kit's LayerChart-powered charts (ADR 0013). */
/** A Series Role position: the categorical hue a chart's marks are drawn in. */
export type ChartSeries = 1 | 2 | 3 | 4 | 5 | 6;
/** Continuous chart coordinate: epoch milliseconds or an equivalent Date. */
export type ChartTimestamp = number | Date;
/** Exact continuous sample-axis bounds shared between comparison panels. */
export type ChartTimeRange = readonly [ChartTimestamp, ChartTimestamp];
/** Shared Density-relative plot height; `height` remains the explicit pixel override. */
export type ChartSize = "sm" | "md" | "lg";
/** Chart-local chrome configuration. All lengths still inherit the surrounding Density. */
export type ChartLayout = "auto" | "dense" | "roomy";
/** Exact sample details can stay inline, overlay the plot during inspection, or remain available to assistive technology only. */
export type ChartReadout = "auto" | "inline" | "overlay" | "hidden";
/** A fixed drawing height, or a chart that uses its bounded parent panel's remaining height. */
export type ChartHeight = number | "fill";
/** Smooth monotone interpolation, or literal straight segments between observations. */
export type ChartCurve = "smooth" | "linear";
export declare const CHART_ROWS: {
    readonly sm: 3;
    readonly md: 6;
    readonly lg: 10;
};
/** Renders one numeric value as axis or bin text. */
export type ChartNumberFormat = (value: number) => string;
/**
 * A locale-free rendering of `value` with at most `fractionDigits` decimals and
 * no trailing zeros. Locale-free on purpose: a label prerendered on the server
 * hydrates unchanged in any browser, and a caller who wants grouping or units
 * passes its own `format`.
 */
export declare function formatChartNumber(value: number, fractionDigits?: number): string;
/**
 * The decimals that tell neighbouring edges `step` apart: one significant digit
 * past the step's own magnitude, so 18 → 23.67 by 5.67 reads `23.7` and a step
 * of 0.25 keeps both its digits.
 */
export declare function fractionDigitsFor(step: number): number;
/**
 * The Density rhythm a chart sizes its own geometry by, read off a probe the
 * roles size (as Graph does): `row` is `control-height-md`, `inset` is
 * `inset-sm`. Before anything is measured — prerender, or a document without
 * layout — a chart draws at the comfortable stop's lengths.
 */
export interface ChartRhythm {
    row: number;
    inset: number;
}
export declare const COMFORTABLE_CHART_RHYTHM: ChartRhythm;
/** Follow `probe`'s box and report the rhythm it measures; returns the disconnect. */
export declare function observeChartRhythm(probe: HTMLElement, update: (rhythm: ChartRhythm) => void): () => void;
/** The bottom gutter for one line of category or time labels under the plot. */
export declare const CATEGORY_AXIS_GUTTER_PX = 28;
/** The width the widest `labels` will take, in px. */
export declare function axisLabelWidth(labels: readonly string[]): number;
/** A left gutter wide enough for the value axis' widest label. */
export declare function valueAxisGutter(labels: readonly string[]): number;
/**
 * How many of `labels`, one per band, fit across `plotWidth` without
 * colliding; LayerChart keeps every n-th band label to match.
 */
export declare function bandLabelCount(labels: readonly string[], plotWidth: number): number;
/**
 * Heatmap intensity is stepped, not interpolated: a colour scale cannot
 * interpolate the `var()` references a scheme-aware fill has to be, so each
 * step is its own fill. Step 0 — no value, zero or less — is the quiet
 * `muted` surface; steps 1–4 lay the chart's series colour (`--color-primary`
 * on the figure) over the ground at rising strength, and both ends follow the
 * Color Scheme because neither is ever resolved to a value here.
 */
export declare const HEATMAP_FILLS: readonly ["var(--reddb-color-muted)", "color-mix(in srgb, var(--color-primary) 25%, transparent)", "color-mix(in srgb, var(--color-primary) 50%, transparent)", "color-mix(in srgb, var(--color-primary) 75%, transparent)", "var(--color-primary)"];
export declare const HEATMAP_STEPS: number;
/** The intensity step (0…HEATMAP_STEPS) of `value` against the largest value shown. */
export declare function heatmapStep(value: unknown, maximum: number): number;
/** Compact trend presentation, shared by both native renderers. */
export type SparklineVariant = "line" | "area" | "bar";
