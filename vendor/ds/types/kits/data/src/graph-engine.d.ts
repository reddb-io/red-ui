import { type GraphOverlayOptions } from "./graph-overlays";
import { type ShapedGraphData } from "./graph";
export interface GraphEngineOptions extends GraphOverlayOptions {
    layout: "stress" | "force" | "radial";
}
export interface GraphEngineController {
    destroy(): void;
    zoom(ratio: number): void;
    fit(): void;
    focusNode(id: string | null): void;
    setData(data: ShapedGraphData, options?: GraphEngineOptions): void;
}
/** Create the canvas renderer. This module is reached only by Graph's on-mount import. */
export declare function mountGraphEngine(host: HTMLElement, initialData: ShapedGraphData, interact?: (kind: "node" | "edge", id: string) => void, initialOptions?: GraphEngineOptions): GraphEngineController;
