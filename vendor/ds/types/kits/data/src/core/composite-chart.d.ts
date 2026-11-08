import { type ColorToken, type ChartPalette } from "./chart-color";
import type { ChartTimeRange } from "../chart";
import { type ChartNumberFormat, type ChartSeries } from "../chart";
/** A shared observation coordinate. String categories cannot be mixed with numbers or Dates. */
export type CompositeX = number | Date | string;
/** One value; null is an explicit gap and is never interpolated over. */
export interface CompositePoint {
    /** Shared time, numeric coordinate or category. */
    x: CompositeX;
    /** Observed value, or null when unavailable. */
    y: number | null;
    /** Optional observation color token, useful for category rankings. */
    color?: ColorToken;
}
/** An OHLC observation; invalid bounds are omitted rather than repaired. */
export interface CandlePoint {
    /** Shared time, numeric coordinate or category. */
    x: CompositeX;
    /** Opening value, inside low and high. */
    open: number;
    /** Highest value, at least open and close. */
    high: number;
    /** Lowest value, at most open and close. */
    low: number;
    /** Closing value, inside low and high. */
    close: number;
}
interface CompositeSeriesIdentity {
    /** Explicit color token, overriding the id palette and series role. */
    color?: ColorToken;
    /** Unique stable identity used by legend state. */
    id: string;
    /** Visible series name. */
    label: string;
    /** Primary scale by default; secondary requires a named secondaryAxis. */
    axis?: "primary" | "secondary";
    /** DS categorical Series Role, assigned cyclically when omitted. */
    series?: ChartSeries;
    /** Ascending drawing order; array order breaks ties. */
    order?: number;
}
/** A line, area or column layer. Columns become horizontal bars when orientation is horizontal. */
export interface CompositeValueSeries extends CompositeSeriesIdentity {
    /** Geometry of this layer, independent of every other series. */
    kind: "line" | "area" | "column";
    /** Caller-owned observations; last duplicate coordinate wins unless preserveDuplicateX is enabled. */
    data: readonly CompositePoint[];
    /** Fade an area fill towards its baseline. */
    gradient?: boolean;
    /** Preserve same-time points in input order to show vertical resets; inspection reads the last value. Only line and area layers support this. */
    preserveDuplicateX?: boolean;
    /** Straight segments by default; dash distinguishes trend or target lines. */
    dash?: "solid" | "dashed" | "dotted";
}
/** A candle layer; hollow rising, filled falling and a cross for unchanged values. */
export interface CompositeCandleSeries extends CompositeSeriesIdentity {
    /** Candle geometry with OHLC bounds. */
    kind: "candlestick";
    /** Caller-owned OHLC observations; last duplicate coordinate wins. */
    data: readonly CandlePoint[];
}
/** One layer in a composed chart. */
export type CompositeChartSeries = CompositeValueSeries | CompositeCandleSeries;
/** A value scale; primary and secondary units are independent. */
export interface CompositeAxis {
    /** Visible unit/scale name, paired with its side in the legend bar. */
    label: string;
    /** Formatter shared by ticks and inspection. */
    format?: ChartNumberFormat;
    /** Exact finite increasing bounds. Omitted, inferred from all layers on this scale. */
    domain?: readonly [number, number];
}
interface ReferenceIdentity {
    /** Unique reference identity. */
    id: string;
    /** Visible text in the reference's accessible description and native tooltip. */
    label: string;
    /** DS Series Role; defaults to six. */
    series?: ChartSeries;
    /** Show the reference label at the plot edge when space permits. */
    showLabel?: boolean;
}
/** A reference level or observation marker. Its direction follows the chosen orientation. */
export type CompositeReference = ReferenceIdentity & ({
    kind: "value"; /** Level on the selected value scale. */
    value: number; /** Primary scale unless specified. */
    axis?: "primary" | "secondary";
} | {
    kind: "sample"; /** Observation coordinate to mark. */
    x: CompositeX;
});
export interface ResolvedCompositePoint {
    x: number;
    value: number | null;
    candle?: CandlePoint;
    paint?: string;
}
export interface ResolvedCompositeSeries {
    format?: ChartNumberFormat;
    id: string;
    label: string;
    kind: CompositeChartSeries["kind"];
    axis: "primary" | "secondary";
    paint: string;
    dash?: string;
    gradient?: boolean;
    points: ResolvedCompositePoint[];
    samples: Map<number, ResolvedCompositePoint>;
}
export interface CompositeSample {
    key: number;
    value: CompositeX;
}
/** Appearance and stacking shared by the native plots. */
export interface CompositeOptions {
    /** Stable series-id color token map. */
    palette?: ChartPalette;
    /** Grouped columns by default, or signed stacks on each value axis. */
    columnMode?: "grouped" | "stacked";
    /** Fraction of each observation slot left empty, from zero to less than one; defaults to 0.28. */
    barPadding?: number;
    /** Category-label rotation on vertical plots; defaults to zero. */
    categoryLabelAngle?: 0 | -45 | -60;
    /** Line and candle stroke width in drawing pixels; omitted, preserves 1.5 for lines and 1 for candles. */
    strokeWidth?: number;
    /** Exact values within stacks or beyond grouped columns. Defaults to none. */
    dataLabels?: "none" | "value";
    /** Show totals above positive and below negative stacks. Defaults to false. */
    showTotals?: boolean;
}
export interface CompositeModel {
    options: CompositeOptions;
    series: ResolvedCompositeSeries[];
    samples: CompositeSample[];
    sampleDomain: [number, number];
    primaryDomain: [number, number];
    secondaryDomain: [number, number];
    categorical: boolean;
    interval: number;
    references: {
        id: string;
        label: string;
        paint: string;
        kind: "value" | "sample";
        value: number;
        axis: "primary" | "secondary";
        showLabel?: boolean;
    }[];
}
export declare const compositePaint: (series?: ChartSeries) => string;
export declare const compositeDash: (dash?: "solid" | "dashed" | "dotted") => "6 3" | "2 3" | undefined;
/** Validate identities/scales and normalize coordinates once, without changing caller data. */
export declare function resolveCompositeChart(data: readonly CompositeChartSeries[], orientation?: "vertical" | "horizontal", primaryAxis?: CompositeAxis, secondaryAxis?: CompositeAxis, references?: readonly CompositeReference[], timeRange?: ChartTimeRange, options?: CompositeOptions): CompositeModel;
/** Exact, timezone-independent default sample description. */
export declare function formatCompositeSample(value: CompositeX): string;
/** Compact default tick labels; exact values remain in the shared readout. */
export declare function formatCompositeTick(value: CompositeX): string;
/** Nearest actual observation, using binary search rather than interpolating missing values. */
export declare function compositeNearest(samples: readonly CompositeSample[], value: number): number;
/** Keyboard sample selection, shared across native adapters. */
export declare function compositeKey(key: string, index: number, count: number): number | undefined;
/** Exact reading. Candle OHLC fields never collapse to just their closing value. */
export declare function compositeReading(series: ResolvedCompositeSeries, key: number | undefined, format?: ChartNumberFormat): string;
/** One shared inspection/empty-state model for inline and maximized native adapters. */
export declare function compositeInspection(model: CompositeModel, hiddenSeries: readonly string[], active: number | undefined, primaryAxis?: CompositeAxis, secondaryAxis?: CompositeAxis, formatX?: typeof formatCompositeSample, hasLegend?: boolean): {
    index: number;
    sample: CompositeSample;
    sampleLabel: string;
    readings: {
        id: string;
        label: string;
        value: string;
    }[];
    announcement: string;
    empty: string | undefined;
};
export interface CompositeTick {
    value: number;
    label: string;
    position: number;
}
export interface CompositeLayout {
    width: number;
    height: number;
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    plotWidth: number;
    plotHeight: number;
    sampleTicks: CompositeTick[];
    primaryTicks: CompositeTick[];
    secondaryTicks: CompositeTick[];
    horizontal: boolean;
}
export declare const compositeProject: (value: number, domain: readonly [number, number], length: number) => number;
/** Shared content-aware gutters and collision-free labels for native chart renderers. */
export declare function compositeLayout(model: CompositeModel, width: number, height: number, horizontal?: boolean, presentation?: "full" | "minimal", primaryAxis?: CompositeAxis, secondaryAxis?: CompositeAxis, formatX?: typeof formatCompositeTick): CompositeLayout;
export {};
