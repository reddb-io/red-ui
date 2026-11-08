import type { TreeNode } from "./tree";
export interface KvEntry {
    key: string;
    value: unknown;
}
export interface KvNode {
    name: string;
    fullKey: string | null;
    value: unknown;
    children: KvNode[];
}
export declare function buildTree(entries: KvEntry[]): KvNode;
export declare function formatValue(v: unknown): string;
/** Filter preserves source order and accepts partial prefixes. */
export declare function filterKvEntries(entries: readonly KvEntry[], prefix: string): KvEntry[];
/** Build structural dictionaries independently from payload objects, including reserved property names. */
export declare function materializeKvJson(entries: readonly KvEntry[], prefix: string): Record<string, unknown>;
export declare function flattenUnderPrefix(entries: KvEntry[], prefix: string): Record<string, unknown>;
export declare function kvTreeNodes(entries: readonly KvEntry[]): TreeNode[];
export declare function kvExpandedIds(nodes: readonly TreeNode[]): string[];
export declare function kvEntryAt(entries: readonly KvEntry[], id: string | null): KvEntry | undefined;
export declare function renderKvSnapshot(entries: KvEntry[]): string;
