import type { VectorExplorerContract } from "./core/contracts/vectorexplorer";
interface Props extends VectorExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const VectorExplorer: import("svelte").Component<Props, {}, "">;
type VectorExplorer = ReturnType<typeof VectorExplorer>;
export default VectorExplorer;
