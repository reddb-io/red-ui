import type { ChartCurve } from "../chart";
import type { SparklineVariant } from "../Sparkline.svelte";
interface Props {
    strokeWidth?: number;
    /** Points to plot, as `{ x, y }`. */
    data: readonly {
        x: number;
        y: number;
    }[];
    curve: ChartCurve;
    variant: SparklineVariant;
    /** Drawing width in px. */
    width: number;
    /** Drawing height in px. */
    height: number;
}
declare const SparklineChart: import("svelte").Component<Props, {}, "">;
type SparklineChart = ReturnType<typeof SparklineChart>;
export default SparklineChart;
