import type { ComponentProps } from "svelte";
import type { ChartEngine } from "./chart-loader.svelte";
export declare const compositeChartEngine: ChartEngine<ComponentProps<typeof import("./internal/CompositeChartPlot.svelte").default>>;
export declare const timeSeriesEngine: ChartEngine<ComponentProps<typeof import("./internal/TimeSeriesChart.svelte").default>>;
export declare const histogramEngine: ChartEngine<ComponentProps<typeof import("./internal/HistogramChart.svelte").default>>;
export declare const heatmapEngine: ChartEngine<ComponentProps<typeof import("./internal/HeatmapChart.svelte").default>>;
export declare const sparklineEngine: ChartEngine<ComponentProps<typeof import("./internal/SparklineChart.svelte").default>>;
/** Load every engine now — for tests and for a caller that knows charts are next. */
export declare function preloadChartEngines(): Promise<void>;
