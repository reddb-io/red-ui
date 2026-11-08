export { explorerFields, filterExplorerEntries, formatExplorerValue, summarizeExplorerEntries } from "./diff-explorer";
export type { DiffExplorerEntry, DiffExplorerField } from "./diff-explorer";
import type { DiffExplorerContract } from "./core/contracts/diffexplorer";
interface Props extends DiffExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const DiffExplorer: import("svelte").Component<Props, {}, "">;
type DiffExplorer = ReturnType<typeof DiffExplorer>;
export default DiffExplorer;
