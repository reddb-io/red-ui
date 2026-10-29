import type { QueryResult } from "./client";
export interface KvEntry {
  key: string;
  value: unknown;
}
function findKeyCol(cols: ReadonlyArray<string>): string | null {
  // Exact preferred names, then any column ending in `_key` (our seed uses
  // `fact_key`/`fact_value`; other apps might use `cfg_key`, etc).
  return (
    cols.find((c) => c.toLowerCase() === "key") ??
    cols.find((c) => c.toLowerCase() === "k") ??
    cols.find((c) => /(^|_)key$/i.test(c)) ??
    null
  );
}

function findValueCol(cols: ReadonlyArray<string>): string | null {
  return (
    cols.find((c) => c.toLowerCase() === "value") ??
    cols.find((c) => c.toLowerCase() === "v") ??
    cols.find((c) => /(^|_)value$/i.test(c)) ??
    null
  );
}

export function extractKv(result: QueryResult): KvEntry[] {
  const cols = result.result.columns;
  const keyCol = findKeyCol(cols);
  const valueCol = findValueCol(cols);
  if (!keyCol || !valueCol) return [];
  return result.result.records.map((r) => ({
    key: String(r.values[keyCol] ?? ""),
    value: r.values[valueCol],
  }));
}

export function hasKvShape(result: QueryResult): boolean {
  const cols = result.result?.columns ?? [];
  return findKeyCol(cols) !== null && findValueCol(cols) !== null;
}
