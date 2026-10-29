import type { QueryResult } from "#reddb";
import {
  visibleColumns,
  visibleRows,
  inferPkColumn,
  identityKind,
  type VisibleColumnsOptions,
} from "@reddb-io/design-system/adapters/reddb/table-results";
import { renderTableSnapshot } from "@reddb-io/design-system/data/table-explorer";
export * from "@reddb-io/design-system/adapters/reddb/table-results";
export function renderTableHtml(
  result: QueryResult,
  opts: VisibleColumnsOptions = {}
): string {
  const columns = visibleColumns(result, opts),
    pk = inferPkColumn(columns);
  return renderTableSnapshot(
    columns.map((key) => ({
      key,
      identity: identityKind(key) ?? undefined,
      badge:
        identityKind(key) === "rid"
          ? "sys"
          : identityKind(key) === "id" || key === pk
            ? "pk"
            : undefined,
    })),
    visibleRows(result)
  );
}
