export type { KvEntry } from "./key-value-explorer";
import type { KeyValueExplorerContract } from "./core/contracts/keyvalueexplorer";
interface Props extends KeyValueExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const KeyValueExplorer: import("svelte").Component<Props, {}, "">;
type KeyValueExplorer = ReturnType<typeof KeyValueExplorer>;
export default KeyValueExplorer;
