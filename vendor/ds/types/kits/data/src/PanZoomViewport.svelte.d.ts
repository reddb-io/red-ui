export type { PanZoomView } from "./pan-zoom";
export type { PanZoomControls } from "./pan-zoom";
import type { PanZoomViewportContract } from "./core/contracts/panzoomviewport";
import { type Snippet } from "svelte";
import { type PanZoomView, type PanZoomControls } from "./pan-zoom";
interface Props extends PanZoomViewportContract {
    /** Reports fit, keyboard, pointer and control changes to the view. */
    onviewchange?: (view: PanZoomView) => void;
    /** Replacement controls receiving the canonical view operations. */
    controls?: Snippet<[PanZoomControls]>;
    /** Unscaled viewport content receiving the current camera transform. */
    overlay?: Snippet<[PanZoomView]>;
    /** Caller-owned drawing. Interactive children retain their native behavior. */
    children: Snippet;
    /** Extra classes on the outer composition. */
    class?: string;
}
declare const PanZoomViewport: import("svelte").Component<Props, {}, "view">;
type PanZoomViewport = ReturnType<typeof PanZoomViewport>;
export default PanZoomViewport;
