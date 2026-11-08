import type { QueueExplorerContract } from "./core/contracts/queueexplorer";
interface Props extends QueueExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const QueueExplorer: import("svelte").Component<Props, {}, "">;
type QueueExplorer = ReturnType<typeof QueueExplorer>;
export default QueueExplorer;
