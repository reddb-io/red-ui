export { applyChanges, filterRows, paginateRows, sortRows, stageChange, valueWithChanges, virtualWindow, } from "./table";
export type { PaginatedRows, PaginationOptions, SortDirection, TableActionsContext, TableCellContext, TableChange, TableColumn, TableColumnAlign, TableFilters, TableRow, TableRowKey, TableSort, VirtualWindow, VirtualWindowOptions, } from "./table";
import type { TableContract } from "./core/contracts/table";
import { type Snippet } from "svelte";
import { type TableActionsContext, type TableCellContext, type TableChange, type TableFilters, type TableRow, type TableRowKey, type TableSort } from "./table";
interface Props extends TableContract {
    /** Receives a complete immutable staged change-set after each edit. */
    onchangeschange?: (changes: readonly TableChange[]) => void;
    /** @deprecated Renamed `onchangeschange` (ADR 0026); removed next release. */
    onChanges?: (changes: readonly TableChange[]) => void;
    /** Reports the sort after a sortable header cycles it. */
    onsortchange?: (sort: TableSort | null) => void;
    /** @deprecated Renamed `onsortchange` (ADR 0026); removed next release. */
    onSort?: (sort: TableSort | null) => void;
    /** Reports every column filter after one changes. */
    onfilterschange?: (filters: TableFilters) => void;
    /** @deprecated Renamed `onfilterschange` (ADR 0026); removed next release. */
    onFilters?: (filters: TableFilters) => void;
    /** Reports the page the reader moved to. */
    onpagechange?: (page: number) => void;
    /** @deprecated Renamed `onpagechange` (ADR 0026); removed next release. */
    onPage?: (page: number) => void;
    /** Caller-owned buttons, links, menus or controls at the end of the toolbar; receives filtered rows, current page, selection and staged edits. Also renders when built-in filters and column visibility are absent. */
    actions?: Snippet<[TableActionsContext]>;
    /** Caller-owned rendering for read-only cells; editing keeps the Table's own editor. */
    cell?: Snippet<[TableCellContext]>;
    /** Caller-owned content for a grid with no rows after filtering. */
    empty?: Snippet;
    /**
     * Item activation (ADR 0026's sanctioned `onselect`): receives the row a
     * pointer or Enter/Space on a read-only cell activates.
     */
    onselect?: (key: TableRowKey, row: TableRow) => void;
    /** @deprecated Renamed `onselect` (ADR 0026); removed next release. */
    onRowSelect?: (key: TableRowKey, row: TableRow) => void;
    /** Extra classes, merged onto the `table` element itself, inside its scroll region. */
    class?: string;
}
declare const Table: import("svelte").Component<Props, {}, "">;
type Table = ReturnType<typeof Table>;
export default Table;
