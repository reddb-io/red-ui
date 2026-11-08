/** Pure path operations for the Data Kit TreeView. This module has no Svelte or DOM dependency. */
export interface TreeNode<Value = unknown> {
    /** Stable node identity. Path-built nodes use their normalized full path. */
    id: string;
    /** Visible node name. */
    label: string;
    /** Caller-owned value when this node represents an input path. */
    value?: Value;
    children: readonly TreeNode<Value>[];
}
export interface PathTreeOptions {
    /** Path separator. Repeated and leading/trailing separators are ignored. */
    separator?: string;
}
export type TreeReorderPosition = "before" | "after" | "inside";
/** A caller-owned move proposed by the TreeView's drag-and-drop affordance. */
export interface TreeReorder {
    sourceId: string;
    targetId: string;
    position: TreeReorderPosition;
}
/**
 * Turn a path-keyed record into an immutable tree. The record and its values remain caller-owned;
 * only the node structure is created here.
 */
export declare function buildPathTree<Value>(paths: Readonly<Record<string, Value>>, options?: PathTreeOptions): readonly TreeNode<Value>[];
/** One visible row in the flattened WAI-ARIA tree, retaining sibling relationships. */
export interface VisibleTreeNode {
    node: TreeNode;
    level: number;
    parentId: string | null;
    position: number;
    setSize: number;
}
/** Visible reading order, shared by native tree adapters. */
export declare function flattenTree(siblings: readonly TreeNode[], open: ReadonlySet<string>, level?: number, parentId?: string | null): readonly VisibleTreeNode[];
/** Resolve a caller-owned identity without depending on a DOM selector's escaping rules. */
export declare function findTreeNode(siblings: readonly TreeNode[], id: string): TreeNode | undefined;
/** Reject recursive reorder targets before asking a caller to mutate its model. */
export declare function treeContains(node: TreeNode, id: string): boolean;
/** Divide a measured row into before/inside/after drop zones. */
export declare function treeDropPosition(node: TreeNode, offset: number, height: number): TreeReorderPosition;
