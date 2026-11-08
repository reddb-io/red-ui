import { type CompositeLayout, type CompositeModel, type ResolvedCompositePoint } from "./composite-chart";
export interface CompositeRect {
    x: number;
    y: number;
    width: number;
    height: number;
    paint?: string;
    value?: number;
}
export interface CompositeCandle extends CompositeRect {
    key: number;
    center: number;
    high: number;
    low: number;
    direction: "up" | "down" | "flat";
}
/** Shared native geometry: the two renderers emit exactly the same marks. */
export declare function compositeGeometry(model: CompositeModel, layout: CompositeLayout, hiddenSeries: readonly string[]): {
    layers: {
        path: string;
        fill: string;
        rects: CompositeRect[];
        candles: CompositeCandle[];
        format?: import("../chart").ChartNumberFormat;
        id: string;
        label: string;
        kind: import("./composite-chart").CompositeChartSeries["kind"];
        axis: "primary" | "secondary";
        paint: string;
        dash?: string;
        gradient?: boolean;
        points: ResolvedCompositePoint[];
        samples: Map<number, ResolvedCompositePoint>;
    }[];
    totals: {
        format: import("../chart").ChartNumberFormat | undefined;
        x: number;
        y: number;
        key: number;
        axis: "primary" | "secondary";
        value: number;
    }[];
    references: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
        id: string;
        label: string;
        paint: string;
        kind: "value" | "sample";
        value: number;
        axis: "primary" | "secondary";
        showLabel?: boolean;
    }[];
    cursor: (key: number) => number;
};
/** Values yield to geometry rather than colliding in dense category comparisons. */
export declare function compositeColumnLabel(rect: CompositeRect, layout: CompositeLayout, stacked: boolean, format: (value: number) => string): {
    text: string;
    visible: boolean;
    x: number;
    y: number;
};
