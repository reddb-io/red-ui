import type { DiffExplorerEntry } from "../../diff-explorer";

/** Portable properties for inspecting a collection of changes. */
export interface DiffExplorerContract {
  /** Accessible name of the change explorer. */
  label: string;
  /** Changes supplied by the caller, in display order. */
  entries: readonly DiffExplorerEntry[];
  /** Optional context displayed alongside the change counts. */
  context?: string;
  /** Message when the supplied list is empty. */
  emptyLabel?: string;
}
