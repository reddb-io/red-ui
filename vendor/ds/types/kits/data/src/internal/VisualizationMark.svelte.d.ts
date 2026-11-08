import type { Snippet } from "svelte";
type $$ComponentProps = {
    id: string;
    label: string;
    selected?: string;
    onselect?: (id: string) => void;
    children: Snippet;
};
declare const VisualizationMark: import("svelte").Component<$$ComponentProps, {}, "">;
type VisualizationMark = ReturnType<typeof VisualizationMark>;
export default VisualizationMark;
