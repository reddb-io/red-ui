/** A caller-supplied numeric measurement. */
export interface StatsMetric {
    /** Stable measurement key. */
    key: string;
    /** Readable metric name. */
    label: string;
    /** Finite observed value. */
    value: number;
    /** Display unit, such as bytes, ms, /s or %. */
    unit: string;
}
/** Format known units without discarding the original observed value. */
export declare function formatStatsMetric(value: number, unit: string): string;
/** Preserve percentage readings and scale other magnitudes relative to the largest observation. */
export declare function statsGaugePercent(value: number, maximum: number): number;
