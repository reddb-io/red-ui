/** Pointer navigation shared by the native SVG adapters; canvas uses its own camera. */
export interface GraphViewport {
    ratio: number;
    x: number;
    y: number;
}
export declare function graphZoomRatio(value: number): number;
export declare function graphViewBox(width: number, height: number, view: GraphViewport): string;
export declare function attachGraphViewport(svg: SVGSVGElement, read: () => {
    width: number;
    height: number;
    view: GraphViewport;
}, write: (view: GraphViewport) => void): () => void;
