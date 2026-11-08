import type { ShapedGraphData, GraphPoint, GraphColorToken } from "./graph";
export interface GraphOverlayOptions {
    grouped?: boolean;
    bundled?: boolean;
}
export interface GraphGroupBox {
    id: string;
    count: number;
    color: GraphColorToken;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface GraphOverlay {
    boxes: GraphGroupBox[];
    paths: Map<string, readonly GraphPoint[]>;
    bundleSkipped: boolean;
}
/** Memoize per data/option change; viewport projection is deliberately separate. */
export declare function graphOverlays(data: ShapedGraphData, options: GraphOverlayOptions): GraphOverlay;
export declare function graphPath(points: readonly GraphPoint[], project: (point: GraphPoint) => GraphPoint): string;
