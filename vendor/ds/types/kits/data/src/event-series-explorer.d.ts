export declare const ALL_METRICS = "__all__";
export interface HypertablePoint {
    t: number;
    v: number;
    raw: Record<string, unknown>;
}
export interface HypertableSeries {
    timeColumn: string;
    metricColumn: string;
    metrics: string[];
    points: HypertablePoint[];
    metricNameColumn: string | null;
}
export interface EventSeries {
    id: string;
    label: string;
    points: readonly HypertablePoint[];
}
export declare const CHART_WIDTH = 640, CHART_HEIGHT = 180, CHART_PADDING = 16;
/** Keep valid observations ordered without changing caller-owned arrays. */
export declare function normalizeEventPoints(points: readonly HypertablePoint[]): HypertablePoint[];
/** Bound allocations while retaining empty intervals between observed events. */
export declare function effectiveBucketMs(points: readonly HypertablePoint[], requested: number): number;
export interface ChartGeometry {
    width: number;
    height: number;
    padding: number;
    path: string;
    minT: number;
    maxT: number;
    minV: number;
    maxV: number;
}
export declare function chartGeometry(series: HypertableSeries, width?: number, height?: number, padding?: number): ChartGeometry | null;
export interface BucketPoint {
    /** Bucket start in epoch ms. */
    t: number;
    /** Number of points falling into this bucket. */
    count: number;
    /** Sum of metric values in this bucket. */
    sum: number;
}
/**
 * Bucket a series into fixed-size windows (default 1 minute). Returns
 * one BucketPoint per bucket *between* minT and maxT inclusive — empty
 * buckets get count=0 so the bar chart shows gaps in writes instead of
 * collapsing them. The user goal is "writes per minute": a bucket whose
 * count is 0 is meaningful information.
 */
export declare function bucketSeries(series: HypertableSeries, bucketMs?: number): BucketPoint[];
export interface BucketGeometry {
    width: number;
    height: number;
    padding: number;
    bars: {
        x: number;
        y: number;
        w: number;
        h: number;
        bucket: BucketPoint;
    }[];
    maxCount: number;
}
export declare function bucketGeometry(buckets: BucketPoint[], width?: number, height?: number, padding?: number): BucketGeometry | null;
export declare function formatEventTime(t: number): string;
export declare function eventPayload(raw: Record<string, unknown>): string;
export declare const bucketOptions: number[];
export declare function bucketLabel(ms: number): string;
export declare function seriesBuckets(points: readonly HypertablePoint[], ms: number): BucketPoint[];
export declare function renderEventSeriesSnapshot(series: HypertableSeries | null): string;
