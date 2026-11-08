export type { SparklineVariant } from "./chart";
export type { ChartCurve, ChartSeries } from "./chart";
export type { ChartLoading } from "./chart-loading";
import type { SparklineContract } from "./core/contracts/sparkline";
interface Props extends SparklineContract {
    /** Extra classes, merged onto the chart's root `figure`. */
    class?: string;
}
declare const Sparkline: import("svelte").Component<Props, {}, "">;
type Sparkline = ReturnType<typeof Sparkline>;
export default Sparkline;
