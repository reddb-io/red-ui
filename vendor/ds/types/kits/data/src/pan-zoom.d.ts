export interface PanZoomView {
    x: number;
    y: number;
    scale: number;
}
export interface ViewportSize {
    width: number;
    height: number;
}
export declare function checkView(view: PanZoomView, min: number, max: number): PanZoomView;
export declare function fitView(content: ViewportSize, viewport: ViewportSize, min: number, max: number): PanZoomView;
/** Preserve the content coordinate beneath an anchor while the scale changes. */
export declare function zoomView(view: PanZoomView, factor: number, anchor: {
    x: number;
    y: number;
}, min: number, max: number): PanZoomView;
/** Canonical operations passed to caller-owned viewport controls. */
export interface PanZoomControls {
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    view: PanZoomView;
}
