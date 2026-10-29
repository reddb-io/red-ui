import type { KvEntry } from "../../key-value-explorer";
/** Portable key/value inspection contract. */
export interface KeyValueExplorerContract {
  /** Accessible name of this data region. */
  label: string;
  /** Slash-delimited keys and their original values. */
  entries: readonly KvEntry[];
  /** Optional collection or dataset name. */
  context?: string;
  /** Message when the dataset has no entries. */
  emptyLabel?: string;
}
