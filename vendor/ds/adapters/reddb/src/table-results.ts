// Pure rendering helpers for the table capability. Used by both the
// Svelte TableRenderer component (for live UI) and the golden snapshot
// test (which needs a DOM-free representation).

import type { QueryResult } from "./client";

export const TABLE_ROW_LIMIT = 80;
export const ELLIPSIS_AT = 64;

/**
 * reddb's reserved public item fields. The server enforces these as
 * unwritable by users (see `crates/reddb-server/src/reserved_fields.rs`)
 * and stamps them onto every read. The UI hides them by default so the
 * user-defined shape is visible; a toggle reintroduces them as a
 * prefix block.
 */
export const SYSTEM_FIELDS = [
  "rid",
  "collection",
  "kind",
  "tenant",
  "created_at",
  "updated_at",
] as const;
const SYSTEM_SET = new Set<string>(SYSTEM_FIELDS);

export function isSystemField(column: string): boolean {
  return SYSTEM_SET.has(column.toLowerCase());
}

export interface VisibleColumnsOptions {
  /** When true, reddb system fields lead; when false (default) they're hidden. */
  showSystem?: boolean;
}

export function visibleColumns(
  result: QueryResult,
  opts: VisibleColumnsOptions = {},
): string[] {
  const all = result.result.columns;
  // `red_*` and `body` are noise even in show-system mode — the row is
  // already unrolled, and red_* are internal-only.
  const usable = all.filter((c) => !c.startsWith("red_") && c !== "body");

  const userCols = usable.filter((c) => !isSystemField(c));
  const id = userCols.find((c) => c.toLowerCase() === "id");
  const userRest = userCols.filter((c) => c !== id);
  const userOrdered = [id, ...userRest].filter((c): c is string => Boolean(c));

  if (!opts.showSystem) {
    return userOrdered.length > 0 ? userOrdered : all;
  }

  // System block, in canonical order (rid first — it's the actual address).
  const systemOrdered = SYSTEM_FIELDS.filter((f) => usable.includes(f));
  return [...systemOrdered, ...userOrdered];
}

export type IdentityKind = "rid" | "id";

export function identityKind(column: string): IdentityKind | null {
  const c = column.toLowerCase();
  if (c === "rid") return "rid";
  if (c === "id") return "id";
  return null;
}

export function inferPkColumn(columns: string[]): string | null {
  // rid wins — it's the system-assigned row id and the actual key
  // reddb uses to address documents. id is user-defined and may not be unique.
  return (
    columns.find((c) => c.toLowerCase() === "rid") ??
    columns.find((c) => c.toLowerCase() === "id") ??
    columns.find((c) => c.toLowerCase().endsWith("_id")) ??
    columns[0] ??
    null
  );
}

export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function isNull(v: unknown): boolean {
  return v === null || v === undefined;
}

export function ellipsize(s: string, max = ELLIPSIS_AT): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export function visibleRows(
  result: QueryResult,
  limit = TABLE_ROW_LIMIT,
): Array<Record<string, unknown>> {
  return result.result.records.slice(0, limit).map((rec) => rec.values);
}

/** A database row address must come from the result, never its display index. */
export function rowId(row: Record<string, unknown>): number | null {
  const value = row.rid;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

/** SELECT construction belongs to the RedDB adapter, never to the Data Kit. */
export function buildTableSelectQuery(
  collection: string,
  request: { columns: readonly string[]; limit: number },
  available: readonly string[],
): string {
  if (!collection || !/^[A-Za-z0-9_./-]+$/.test(collection))
    throw new Error("Invalid collection name.");
  const allowed = available.filter((key) =>
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(key),
  );
  const selected = [...new Set(request.columns)];
  if (selected.some((key) => !allowed.includes(key)))
    throw new Error("Invalid projection column.");
  const projection =
    !selected.length || selected.length === allowed.length
      ? "*"
      : selected.join(", ");
  const limit = Number.isFinite(request.limit)
    ? Math.max(1, Math.min(1000, Math.floor(request.limit)))
    : 200;
  return `SELECT ${projection} FROM ${collection} LIMIT ${limit}`;
}
