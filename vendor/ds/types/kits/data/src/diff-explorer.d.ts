/** A caller-supplied change to inspect. It is independent of a database or transport. */
export interface DiffExplorerEntry {
    /** Stable identity, unique within the current list. */
    id: string;
    /** Human-readable change category, such as added or modified. */
    change: string;
    /** Optional item identity shown in the list and detail. */
    entityId?: string | null;
    /** Optional group or collection containing the item. */
    group?: string | null;
    /** Optional description of the change. */
    note?: string | null;
    /** Earlier item value. */
    before: unknown;
    /** Later item value. */
    after: unknown;
    /** Original caller-supplied record for the raw view. */
    raw: unknown;
}
export interface DiffExplorerField {
    field: string;
    before: unknown;
    after: unknown;
    status: "added" | "removed" | "modified" | "unchanged";
}
/** A readable display of values used by the list, search and raw views. */
export declare function formatExplorerValue(value: unknown): string;
/** Compare top-level fields while preserving absence versus an explicit undefined. */
export declare function explorerFields(entry: DiffExplorerEntry): DiffExplorerField[];
/** Search the identity, category, group and compared values without mutating the list. */
export declare function filterExplorerEntries(entries: readonly DiffExplorerEntry[], filter: string): DiffExplorerEntry[];
/** Count change categories in stable alphabetical order. */
export declare function summarizeExplorerEntries(entries: readonly DiffExplorerEntry[]): Array<[string, number]>;
