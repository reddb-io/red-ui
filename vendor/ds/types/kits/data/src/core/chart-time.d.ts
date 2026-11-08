import type { ChartTimestamp, ChartTimeRange } from "../chart";
/** Validate a caller-owned continuous sample-axis viewport. */
export declare function chartTimeRange(range: ChartTimeRange | undefined): [number, number] | undefined;
/** Nearest retained observation by timestamp; an unset cursor reads the latest. */
export declare function chartTimeIndex<T>(samples: readonly T[], active: ChartTimestamp | null | undefined, timestamp: (sample: T) => number): number;
/** A linked cursor only draws inside the visible continuous domain. */
export declare function chartCursor(active: ChartTimestamp | null | undefined, domain: readonly [number, number]): number | undefined;
/** Only draw the visible sorted window plus two neighbours at each edge.
 * Neighbours preserve clipped segments and monotone tangents without repainting retained history.
 */
export declare function chartWindowPoints<T>(points: readonly T[], domain: readonly [number, number], timestamp: (point: T) => number): readonly T[];
