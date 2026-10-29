import type { DiffEntry } from "@reddb-io/design-system/adapters/reddb/diff-results";
import {
  explorerFields,
  formatExplorerValue,
  summarizeExplorerEntries,
  type DiffExplorerEntry,
  type DiffExplorerField,
} from "@reddb-io/design-system/data/diff-explorer";

export {
  extractDiffEntries,
  hasDiffShape,
} from "@reddb-io/design-system/adapters/reddb/diff-results";
export type { DiffEntry } from "@reddb-io/design-system/adapters/reddb/diff-results";
export type DiffFieldChange = DiffExplorerField;

/** Map the RedDB response into the transport-independent Data Kit contract. */
export function toExplorerEntry(entry: DiffEntry): DiffExplorerEntry {
  return {
    id: entry.id,
    change: entry.change,
    entityId: entry.entityId,
    group: entry.collection,
    note: entry.note,
    before: entry.before,
    after: entry.after,
    raw: entry.values,
  };
}
export const formatDiffValue = formatExplorerValue;
export function diffEntryFields(entry: DiffEntry): DiffFieldChange[] {
  return explorerFields(toExplorerEntry(entry));
}
export function summarizeDiff(entries: DiffEntry[]) {
  return summarizeExplorerEntries(entries.map(toExplorerEntry));
}
