import type { TableRow, TableColumn } from "./table";
export interface TableQueryRequest {
    columns: readonly string[];
    limit: number;
}
export declare function filterTableRows(rows: readonly TableRow[], filters: Readonly<Record<string, string>>): TableRow[];
export declare function explorerTableColumns(columns: readonly TableColumn[], rows: readonly TableRow[]): TableColumn[];
/** Normalize HTML number input before invoking a host, including blank and non-finite values. */
export declare function tableQueryRequest(columns: readonly string[], limit: number): TableQueryRequest;
export declare function renderTableSnapshot(columns: readonly {
    key: string;
    identity?: string;
    badge?: string;
}[], rows: readonly TableRow[]): string;
