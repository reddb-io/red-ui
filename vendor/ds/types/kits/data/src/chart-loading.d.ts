/** Load as the figure nears the viewport, or immediately after mounting. */
export type ChartLoading = "lazy" | "eager";
/** Begin loading outside the viewport so marks are ready when they scroll into view. */
export declare const CHART_LOAD_MARGIN = "320px";
/** Renderer-neutral visibility observer; environments without layout load immediately. */
export declare function whenNear(element: Element, near: () => void): () => void;
