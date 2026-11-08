export type { ChartCurve, ChartNumberFormat, ChartSeries, ChartSize, ChartLayout, ChartReadout, ChartHeight, ChartTimestamp, ChartTimeRange } from "./chart";
export type { ChartLoading } from "./chart-loading";
export type { TimeSeriesPoint, TimeSeriesDataset } from "./time-series";
export type { TimeSeriesVariant } from "./time-series";
import type { TimeSeriesContract } from "./core/contracts/timeseries";
interface Props extends TimeSeriesContract {
    /** Called after a legend action changes hidden dataset ids. */
    onhiddenserieschange?: (ids: readonly string[]) => void;
    /** Reports linked inspection as an epoch timestamp, or null to clear it. */
    onactivexchange?: (value: number | null) => void;
    /** Commits a sample with a pointer press or Enter/Space, independently of hover inspection. */
    onselect?: (value: number) => void;
    /** Extra classes, merged onto the chart's root `figure`. */
    class?: string;
}
declare const TimeSeries: import("svelte").Component<Props, {}, "hiddenSeries" | "activeX">;
type TimeSeries = ReturnType<typeof TimeSeries>;
export default TimeSeries;
