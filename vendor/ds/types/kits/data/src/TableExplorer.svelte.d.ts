import type { TableExplorerContract } from "./core/contracts/tableexplorer";
interface Props extends TableExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const TableExplorer: import("svelte").Component<Props, {}, "">;
type TableExplorer = ReturnType<typeof TableExplorer>;
export default TableExplorer;
