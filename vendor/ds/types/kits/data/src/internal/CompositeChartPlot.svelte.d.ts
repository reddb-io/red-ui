import type { CompositeLayout, CompositeModel } from "../core/composite-chart";
interface Props {
    model: CompositeModel;
    layout: CompositeLayout;
    hiddenSeries: readonly string[];
    cursor?: number;
    presentation: "full" | "minimal";
}
declare const CompositeChartPlot: import("svelte").Component<Props, {}, "">;
type CompositeChartPlot = ReturnType<typeof CompositeChartPlot>;
export default CompositeChartPlot;
