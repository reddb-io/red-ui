import type {
  TableRow,
  TableColumn,
  TableChange,
  TableRowKey,
} from "../../table";
import type { TableQueryRequest } from "../../table-explorer";
/** Generic result grid, filtering and caller-owned query projection. */
export interface TableExplorerContract {
  /** Accessible result name. */
  label: string;
  /** Column display and editing contracts. */
  columns: readonly TableColumn[];
  /** Immutable source rows. Keys always address these source rows after filtering. */
  rows: readonly TableRow[];
  /** Stable key independent of filtering and display order. */
  rowKey: string | ((row: TableRow, index: number) => TableRowKey);
  /** Total result count, including rows outside the current source window. */
  total?: number;
  /** Optional dataset name. */
  context?: string;
  /** Query error, distinguished from an empty result. */
  error?: string | null;
  /** Whether each source cell can be edited. */
  editable?: boolean | ((row: TableRow, column: TableColumn) => boolean);
  /** Staged cells keyed by source identity. */
  changes?: readonly TableChange[];
  /** Reports a proposed staged change-set to the host. */
  onchangeschange?: (changes: readonly TableChange[]) => void;
  /** Safe projection keys, if querying is supported by the host. */
  queryColumns?: readonly string[];
  /** Runs the projection and updates the caller-owned rows. */
  onquery?: (request: TableQueryRequest, signal: AbortSignal) => Promise<void>;
  /** Restores the original caller-owned result. */
  onreset?: () => void;
  /** Formats the query preview without coupling the Kit to a query language. */
  describequery?: (request: TableQueryRequest) => string;
  /** Optional description of the source row identity. */
  identityLabel?: string;
}
