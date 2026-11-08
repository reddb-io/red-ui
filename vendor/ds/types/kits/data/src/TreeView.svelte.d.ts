export { buildPathTree } from "./tree";
export type { PathTreeOptions, TreeNode, TreeReorder, TreeReorderPosition, } from "./tree";
import type { TreeViewContract } from "./core/contracts/treeview";
import { type Snippet } from "svelte";
import { type TreeNode, type TreeReorder } from "./tree";
interface Props extends TreeViewContract {
    /** Reports the expanded node ids after a node opens or closes. */
    onexpandedchange?: (expanded: readonly string[]) => void;
    /** @deprecated Renamed `onexpandedchange` (ADR 0026); removed next release. */
    onExpanded?: (expanded: readonly string[]) => void;
    /** Reports the selected node id after the selection moves. */
    onselectedchange?: (selected: string | null) => void;
    /** @deprecated Renamed `onselectedchange` (ADR 0026); removed next release. */
    onSelected?: (selected: string | null) => void;
    /** Receives a committed rename: the node and its new label. */
    onrename?: (node: TreeNode, label: string) => void;
    /** @deprecated Renamed `onrename` (ADR 0026); removed next release. */
    onRename?: (node: TreeNode, label: string) => void;
    /** Receives a dropped move. */
    onreorder?: (move: TreeReorder) => void;
    /** @deprecated Renamed `onreorder` (ADR 0026); removed next release. */
    onReorder?: (move: TreeReorder) => void;
    /** Caller-owned decoration before a node's label, such as a kind icon. */
    leading?: Snippet<[TreeNode]>;
    /** Caller-owned detail after a node's label, such as a count or type. */
    trailing?: Snippet<[TreeNode]>;
    /** Extra classes, merged onto the root `ul` that is the tree. */
    class?: string;
}
declare const TreeView: import("svelte").Component<Props, {}, "">;
type TreeView = ReturnType<typeof TreeView>;
export default TreeView;
