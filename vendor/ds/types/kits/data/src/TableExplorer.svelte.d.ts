import type { TableExplorerContract } from "./core/contracts/tableexplorer";
interface Props extends TableExplorerContract {
    /** Called when the person retries after a failed load. */
    onretry?: () => void;
    /** Extra root classes. */
    class?: string;
}
declare const TableExplorer: import("svelte").Component<Props, {}, "">;
type TableExplorer = ReturnType<typeof TableExplorer>;
export default TableExplorer;
