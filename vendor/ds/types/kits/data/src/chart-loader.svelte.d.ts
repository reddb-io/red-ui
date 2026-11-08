import type { Component } from "svelte";
/** One chart engine: the LayerChart drawing, loaded once and shared by every instance. */
export interface ChartEngine<Props extends Record<string, any>> {
    /** The loaded drawing, or `null` until `load()` resolves. */
    readonly current: Component<Props> | null;
    /** Start (or join) the dynamic import; resolves once `current` is set. */
    load(): Promise<void>;
}
export declare function chartEngine<Props extends Record<string, any>>(importer: () => Promise<{
    default: Component<Props>;
}>): ChartEngine<Props>;
export { CHART_LOAD_MARGIN, whenNear, type ChartLoading } from "./chart-loading";
import { type ChartLoading } from "./chart-loading";
/**
 * Wire one chart instance: returns whether its engine should render, flipping
 * once the figure is near (or at mount, for `eager`) and starting the load.
 */
export declare function lazyChart<Props extends Record<string, any>>(engine: ChartEngine<Props>, figure: () => Element | undefined, loading: () => ChartLoading): {
    /** The engine to render, once wanted and loaded; `null` renders the placeholder. */
    readonly Engine: Component<Props> | null;
};
