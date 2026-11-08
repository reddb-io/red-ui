import type { GraphExplorerContract } from "./core/contracts/graphexplorer";
interface Props extends GraphExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const GraphExplorer: import("svelte").Component<Props, {}, "">;
type GraphExplorer = ReturnType<typeof GraphExplorer>;
export default GraphExplorer;
