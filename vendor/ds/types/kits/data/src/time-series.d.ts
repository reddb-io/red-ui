import { type ChartPalette, type ColorToken } from "./core/chart-color";
import { type ChartSeries } from "./chart";
export interface TimeSeriesPoint {
    x: number | Date;
    y: number;
}
/** One named measurement on a shared time and value scale. */
export interface TimeSeriesDataset {
    /** Stable identity: visibility follows this id when data is refreshed or reordered. */
    id: string;
    /** Visible legend name. */
    label: string;
    /** Points in this measurement; missing timestamps are not interpolated in the readout. */
    data: readonly TimeSeriesPoint[];
    /** DS Series Role. Explicit role; omitted roles use the automatic 10/40 palette. */
    series?: ChartSeries;
    /** Explicit color custom-property name, overriding a palette entry. */
    color?: ColorToken;
}
export interface ResolvedTimeSeries extends TimeSeriesDataset {
    paint: string;
    samples: ReadonlyMap<number, number>;
}
export declare function timeSeriesDatasets(data: readonly TimeSeriesPoint[] | readonly TimeSeriesDataset[], label: string, series: ChartSeries, palette?: ChartPalette): ResolvedTimeSeries[];
export declare function timeSeriesSamples(datasets: readonly TimeSeriesDataset[]): (number | Date)[];
export declare function nearestTimeIndex(samples: readonly (number | Date)[], value: number): number;
export declare function timeSeriesDomain(samples: readonly (number | Date)[]): [number, number];
export declare function formatTimeSample(value: number | Date): string;
/** Date axes label observed timestamps; numeric coordinates keep the scale's native ticks. */
export declare function timeSeriesDateTicks(samples: readonly (number | Date)[], capacity: number): number[] | undefined;
/** Compact UTC labels follow the observed time span; the readout retains its exact timestamp. */
export declare function formatTimeTick(value: number | Date, samples: readonly (number | Date)[]): string;
/** Explicit value bounds stay exact; an area must retain its zero baseline. */
export declare function timeSeriesValueDomain(domain: readonly [number, number] | undefined, area: boolean): [number, number] | undefined;
/** Temporal columns share sample positions and diverge around zero. Missing samples remain absent. */
export declare function timeSeriesBars(datasets: readonly ResolvedTimeSeries[], timestamps?: readonly (number | Date)[]): {
    id: string;
    paint: string;
    data: {
        x: number;
        x1: number;
        y: number;
        y1: number;
    }[];
}[];
/** Stacked areas retain missing-observation gaps instead of inventing zero contributions. */
export declare function timeSeriesAreas(datasets: readonly ResolvedTimeSeries[], timestamps: readonly (number | Date)[]): {
    id: string;
    data: {
        x: number;
        y: number;
        y1: number;
        defined: boolean;
    }[];
}[];
/** Shared temporal mark vocabulary. */
export type TimeSeriesVariant = "line" | "area" | "stacked-area" | "bar";
/** Reserve typography space at both timeline edges, including exact caller-owned bounds. */
export declare function timeSeriesPadding(samples: readonly (number | Date)[], domain: readonly [number, number], valueLabels: readonly string[], formatX: ((value: number | Date) => string) | undefined, inset: number, minimal: boolean): {
    top: number;
    right: number;
    bottom: number;
    left: number;
};
