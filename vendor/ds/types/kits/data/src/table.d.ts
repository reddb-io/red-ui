/** Pure data operations for the Data Kit Table. This module has no Svelte or DOM dependency. */
export type TableRow = Record<string, unknown>;
export type TableRowKey = string | number;
export type SortDirection = "ascending" | "descending";
export interface TableSort {
    key: string;
    direction: SortDirection;
}
export type TableColumnAlign = "start" | "end";
/** What a caller-owned `cell` snippet receives for one read-only body cell. */
export interface TableCellContext<Row extends TableRow = TableRow> {
    column: TableColumn<Row>;
    row: Row;
    /** The displayed value, staged changes included. */
    value: unknown;
    /** The column's formatted text for `value`. */
    text: string;
}
/** Read-only state supplied to caller-owned Table toolbar actions. */
export interface TableActionsContext {
    /** All filtered and sorted source rows, across pages; staged edits are supplied in changes. */
    rows: readonly TableRow[];
    /** Source rows on the current page, including virtualized rows outside the viewport. */
    pageRows: readonly TableRow[];
    /** Caller-controlled selection, or null when nothing is selected. */
    selectedRow: TableRowKey | null;
    /** Current immutable staged edits, for save or export actions. */
    changes: readonly TableChange[];
    /** Active column filters. */
    filters: TableFilters;
    /** Active sort, or null for source order. */
    sort: TableSort | null;
}
export interface TableColumn<Row extends TableRow = TableRow> {
    /** Stable property key used to read this column from a row. */
    key: keyof Row & string;
    /** Visible column heading. */
    header: string;
    /** Include this column in the sort cycle. */
    sortable?: boolean;
    /** Include a text field for this column in the filter row. */
    filterable?: boolean;
    /** Example query shown in this column's empty filter field. */
    filterPlaceholder?: string;
    /** Inline alignment. `end` also sets tabular numerals, for quantities that compare by column. */
    align?: TableColumnAlign;
    /** Allow this column to enter edit mode when the Table has editing capability. */
    editable?: boolean;
    /** Caller-owned comparison for values in this column. */
    compare?: (left: unknown, right: unknown, leftRow: Row, rightRow: Row) => number;
    /** Caller-owned filter predicate. The query has already been trimmed. */
    filter?: (value: unknown, query: string, row: Row) => boolean;
    /** Convert an editor's text back to the row's value type. */
    parse?: (input: string, previous: unknown, row: Row) => unknown;
    /** Format a value for read-only display and the initial editor text. */
    format?: (value: unknown, row: Row) => string;
}
export type TableFilters = Readonly<Record<string, string | undefined>>;
export interface PaginationOptions {
    /** One-based requested page. Out-of-range values are clamped. */
    page: number;
    pageSize: number;
}
export interface PaginatedRows<Row> {
    rows: readonly Row[];
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
    /** Zero-based inclusive index in the unpaginated collection. */
    start: number;
    /** Zero-based exclusive index in the unpaginated collection. */
    end: number;
}
export interface VirtualWindowOptions {
    scrollTop: number;
    viewportHeight: number;
    rowHeight: number;
    overscan?: number;
}
export interface VirtualWindow<Row> {
    items: readonly Row[];
    /** Zero-based inclusive row index. */
    start: number;
    /** Zero-based exclusive row index. */
    end: number;
    offsetTop: number;
    offsetBottom: number;
    totalHeight: number;
}
export interface TableChange<Value = unknown> {
    rowKey: TableRowKey;
    columnKey: string;
    previous: Value;
    value: Value;
}
/** Return a stably sorted copy. Missing columns or sort state leave the caller order intact. */
export declare function sortRows<Row extends TableRow>(rows: readonly Row[], columns: readonly TableColumn<Row>[], sort: TableSort | null | undefined): readonly Row[];
/** Apply every non-empty column query with AND semantics without mutating rows. */
export declare function filterRows<Row extends TableRow>(rows: readonly Row[], columns: readonly TableColumn<Row>[], filters: TableFilters | null | undefined): readonly Row[];
/** Slice a one-based page and report the clamped paging state. */
export declare function paginateRows<Row>(rows: readonly Row[], options: PaginationOptions): PaginatedRows<Row>;
/** Compute an overscanned fixed-height window; the returned end is exclusive. */
export declare function virtualWindow<Row>(rows: readonly Row[], options: VirtualWindowOptions): VirtualWindow<Row>;
/**
 * Add or replace one cell change. Returning a value to its original state removes that cell
 * from the change-set; the original `previous` value survives repeated edits.
 */
export declare function stageChange<Value>(changes: readonly TableChange[], next: TableChange<Value>): readonly TableChange[];
/** Read a staged value when present, otherwise return the caller-owned row value. */
export declare function valueWithChanges(value: unknown, changes: readonly TableChange[], rowKey: TableRowKey, columnKey: string): unknown;
/** Materialize a change-set into new objects, leaving untouched rows referentially intact. */
export declare function applyChanges<Row extends TableRow>(rows: readonly Row[], changes: readonly TableChange[], rowKey: (row: Row, index: number) => TableRowKey): readonly Row[];
