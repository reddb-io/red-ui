import type { Snippet } from "svelte";
import { type VisualizationSeries, type VisualizationRow, type VisualizationSize } from "../visualization";
interface Props {
    label: string;
    description?: string;
    kind: string;
    width?: number;
    height?: number;
    widthUnits?: number;
    heightUnits?: number;
    size?: VisualizationSize;
    rows?: readonly VisualizationRow[];
    legend?: readonly {
        id: string;
        label: string;
        color?: import("@reddb-io/design-system/base/recipes").ColorToken;
        series?: VisualizationSeries;
    }[];
    selected?: string;
    onselect?: (id: string) => void;
    detailHref?: string;
    class?: string;
    children: Snippet<[{
        width: number;
        height: number;
        unit: number;
    }]>;
}
declare const VisualizationFrame: import("svelte").Component<Props, {}, "">;
type VisualizationFrame = ReturnType<typeof VisualizationFrame>;
export default VisualizationFrame;
