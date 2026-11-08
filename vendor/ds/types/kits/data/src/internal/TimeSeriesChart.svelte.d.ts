import type { ChartCurve, ChartNumberFormat } from "../chart";
import type { ResolvedTimeSeries } from "../time-series";
interface Props {
    strokeWidth?: number;
    /** Points to plot, as `{ x, y }`. */
    data: readonly {
        x: number | Date;
        y: number;
    }[];
    datasets: readonly ResolvedTimeSeries[];
    domain: [number, number];
    samples: readonly (number | Date)[];
    valueDomain?: [number, number];
    cursor?: number | Date;
    formatX?: (value: number | Date) => string;
    /** `area` fills to zero; `line` reads the data's own range. */
    variant: "line" | "area" | "stacked-area" | "bar";
    curve: ChartCurve;
    presentation: "full" | "minimal";
    barDomain: [number, number];
    /** Value-axis tick formatter. */
    format: ChartNumberFormat;
    /** Zero for an area, none for a line. */
    baseline: number | undefined;
    /** Drawing width in px. */
    width: number;
    /** Drawing height in px. */
    height: number;
    /** Plot padding in px. */
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}
declare const TimeSeriesChart: import("svelte").Component<Props, {}, "">;
type TimeSeriesChart = ReturnType<typeof TimeSeriesChart>;
export default TimeSeriesChart;
