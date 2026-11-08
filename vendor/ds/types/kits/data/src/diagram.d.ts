import { type VisualizationItem } from "./visualization";
export interface DiagramNode extends VisualizationItem {
    kind?: "process" | "decision" | "store" | "terminal";
    group?: string;
}
export interface DiagramEdge extends VisualizationItem {
    source: string;
    target: string;
    dashed?: boolean;
}
export interface DiagramData {
    nodes: readonly DiagramNode[];
    edges: readonly DiagramEdge[];
}
/** Stable ranks; unresolved cyclic nodes keep distinct positions instead of overlapping. */
export declare function diagramRanks(data: DiagramData): {
    rank: Map<string, number>;
    counts: Map<number, number>;
    levels: number;
    lanes: number;
};
export declare function diagramDimensions(data: DiagramData, direction?: "right" | "down"): {
    widthUnits: number;
    heightUnits: number;
};
/** Bounded column and lane gaps: large containers never stretch a small graph. */
export declare function diagramLayout(data: DiagramData, width: number, height: number, direction?: "right" | "down", unit?: number): {
    nodes: {
        width: number;
        height: number;
        x: number;
        y: number;
        kind?: "process" | "decision" | "store" | "terminal";
        group?: string;
        color?: import("./core/chart-color").ColorToken;
        id: string;
        label: string;
        description?: string;
        series?: import("./visualization").VisualizationSeries;
        href?: string;
    }[];
    edges: readonly DiagramEdge[];
    levels: number;
};
export declare function diagramConnection(a: {
    x: number;
    y: number;
    width: number;
    height: number;
}, b: typeof a, direction: "right" | "down", unit: number): {
    path: string;
    arrow: string;
    labelX: number;
    labelY: number;
    labelAnchor: "start" | "end" | "middle";
};
