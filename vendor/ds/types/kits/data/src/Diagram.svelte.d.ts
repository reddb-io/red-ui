export type { VisualizationSize, VisualizationSeries } from "./visualization";
export type { DiagramData, DiagramNode, DiagramEdge } from "./diagram";
import type { DiagramContract } from "./core/contracts/diagram";
interface Props extends DiagramContract {
    /** Reports selection for application-owned filtering or detail navigation. */
    onselectedchange?: (id: string) => void;
    /** Extra classes on the outer figure. */
    class?: string;
}
declare const Diagram: import("svelte").Component<Props, {}, "selected">;
type Diagram = ReturnType<typeof Diagram>;
export default Diagram;
