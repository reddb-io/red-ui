export { buildPathTree } from "./tree";
export type { PathTreeOptions, TreeNode, TreeReorder, TreeReorderPosition, } from "./tree";
import type { TreeViewContract } from "./core/contracts/treeview";
import { type Snippet } from "svelte";
import { type TreeNode, type TreeReorder } from "./tree";
interface Props extends TreeViewContract {
    /** Reports the expanded node ids after a node opens or closes. */
    onexpandedchange?: (expanded: readonly string[]) => void;
    /** Reports the selected node id after the selection moves. */
    onselectedchange?: (selected: string | null) => void;
    /** Receives a committed rename: the node and its new label. */
    onrename?: (node: TreeNode, label: string) => void;
    /** Receives a dropped move. */
    onreorder?: (move: TreeReorder) => void;
    /** Caller-owned decoration before a node's label, such as a kind icon. */
    leading?: Snippet<[TreeNode]>;
    /** Caller-owned detail after a node's label, such as a count or type. */
    trailing?: Snippet<[TreeNode]>;
    /** Called when the person retries after a failed load. */
    onretry?: () => void;
    /** Extra classes, merged onto the root `ul` that is the tree (or onto the loading, empty or error state that replaces it). */
    class?: string;
}
declare const TreeView: import("svelte").Component<Props, {}, "">;
type TreeView = ReturnType<typeof TreeView>;
export default TreeView;
