export interface VectorRow {
  index: number;
  id: string;
  vectorColumn: string | null;
  vector: number[];
  dimension: number;
  scalarColumn: string | null;
  scalar: number | null;
  metadata: Record<string, unknown>;
}

export function vectorMagnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

export function scalarLabel(row: Pick<VectorRow, "scalarColumn">): string {
  if (!row.scalarColumn) return "ranking metric";
  if (/distance/i.test(row.scalarColumn))
    return `search distance · ${row.scalarColumn}`;
  if (/similarity/i.test(row.scalarColumn))
    return `similarity score · ${row.scalarColumn}`;
  if (/score/i.test(row.scalarColumn)) return `score · ${row.scalarColumn}`;
  if (/turbovec|scalar/i.test(row.scalarColumn))
    return `scalar projection · ${row.scalarColumn}`;
  if (/magnitude|norm/i.test(row.scalarColumn))
    return `vector magnitude · ${row.scalarColumn}`;
  return `ranking metric · ${row.scalarColumn}`;
}

export function compactValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function parseVectorInput(input: string): number[] {
  const numbers = input
    .replace(/[\[\]]/g, " ")
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
  if (numbers.length === 0) throw new Error("Paste a numeric vector first.");
  const invalid = numbers.find((n) => !Number.isFinite(n));
  if (invalid !== undefined)
    throw new Error("Vector contains a non-numeric value.");
  return numbers;
}

export type VectorSearchRequest = (
  | { kind: "text"; text: string }
  | { kind: "vector"; vector: number[] }
) & { limit: number };
export interface VectorSearchResponse {
  rows: readonly VectorRow[];
  note?: string;
}
export function filterVectorRows(
  rows: readonly VectorRow[],
  filter: string,
): VectorRow[] {
  const term = filter.trim().toLowerCase();
  return rows.filter(
    (row) =>
      !term ||
      row.id.toLowerCase().includes(term) ||
      Object.values(row.metadata).some((value) =>
        compactValue(value).toLowerCase().includes(term),
      ),
  );
}
export function vectorSearchRequest(
  kind: "text" | "vector",
  input: string,
  limit: number,
): VectorSearchRequest {
  const count = Math.max(1, Math.min(200, Math.floor(Number(limit) || 20)));
  if (kind === "vector")
    return { kind, vector: parseVectorInput(input), limit: count };
  const text = input.trim();
  if (!text) throw new Error("Enter text to search.");
  return { kind, text, limit: count };
}
export function vectorCoordinatePercent(
  value: number,
  vector: readonly number[],
): number {
  const max = vector.reduce(
    (previous, current) => Math.max(previous, Math.abs(current)),
    1,
  );
  return (Math.abs(value) / max) * 100;
}
