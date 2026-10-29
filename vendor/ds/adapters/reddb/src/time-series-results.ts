import type { QueryResult } from "./client";
export const ALL_METRICS = "__all__";

const TIME_KEYS = [
  "time",
  "timestamp",
  "ts",
  "event_time",
  "bucket",
  "created_at",
];
const SYSTEM_NUMERIC_KEYS = new Set([
  "created_at",
  "updated_at",
  "time",
  "timestamp",
  "timestamp_ns",
  "rid",
  "tenant",
]);

export interface HypertablePoint {
  t: number;
  v: number;
  raw: Record<string, unknown>;
}

export interface HypertableSeries {
  timeColumn: string;
  metricColumn: string;
  metrics: string[];
  points: HypertablePoint[];
  metricNameColumn: string | null;
}

function isNumericValue(v: unknown): v is number {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n);
  }
  return false;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  return Number(v);
}

function toTimestamp(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    const d = Date.parse(v);
    return Number.isNaN(d) ? null : d;
  }
  return null;
}

export function pickTimeColumn(result: QueryResult): string | null {
  const cols = result.result?.columns ?? [];
  for (const key of TIME_KEYS) {
    const found = cols.find((c) => c.toLowerCase() === key);
    if (found) return found;
  }
  const records = result.result?.records ?? [];
  if (records.length === 0) return null;
  // Fallback: any column whose first non-null value parses as a date.
  for (const c of cols) {
    const sample = records.find(
      (r) => r.values[c] !== null && r.values[c] !== undefined,
    );
    if (!sample) continue;
    if (
      toTimestamp(sample.values[c]) !== null &&
      !isNumericValue(sample.values[c])
    ) {
      return c;
    }
  }
  return null;
}

export function numericColumns(
  result: QueryResult,
  exclude: string | null,
): string[] {
  const cols = result.result?.columns ?? [];
  const records = result.result?.records ?? [];
  if (records.length === 0) return [];
  const out: string[] = [];
  for (const c of cols) {
    if (c === exclude) continue;
    if (c.startsWith("red_")) continue;
    if (SYSTEM_NUMERIC_KEYS.has(c.toLowerCase())) continue;
    const sample = records.find(
      (r) => r.values[c] !== null && r.values[c] !== undefined,
    );
    if (!sample) continue;
    if (isNumericValue(sample.values[c])) out.push(c);
  }
  return out;
}

export function hasHypertableShape(result: QueryResult): boolean {
  const t = pickTimeColumn(result);
  if (!t) return false;
  return numericColumns(result, t).length > 0;
}

export function extractSeries(
  result: QueryResult,
  metric?: string,
): HypertableSeries | null {
  const timeColumn = pickTimeColumn(result);
  if (!timeColumn) return null;
  const metricNameColumn =
    result.result.columns.find((c) => c.toLowerCase() === "metric") ?? null;
  const valueColumn =
    result.result.columns.find((c) => c.toLowerCase() === "value") ?? null;
  if (metricNameColumn && valueColumn) {
    const names = new Set<string>();
    const allPoints: HypertablePoint[] = [];
    for (const rec of result.result.records) {
      const name = rec.values[metricNameColumn];
      const value = rec.values[valueColumn];
      if (
        (typeof name === "string" || typeof name === "number") &&
        isNumericValue(value)
      ) {
        names.add(String(name));
        const t = toTimestamp(rec.values[timeColumn]);
        if (t !== null)
          allPoints.push({ t, v: toNumber(value), raw: rec.values });
      }
    }
    const metrics = [...names].sort();
    if (metrics.length > 0) {
      if (!metric || metric === ALL_METRICS) {
        allPoints.sort((a, b) => a.t - b.t);
        return {
          timeColumn,
          metricColumn: valueColumn,
          metrics: [ALL_METRICS, ...metrics],
          points: allPoints,
          metricNameColumn,
        };
      }
      const selectedMetric = metrics.includes(metric) ? metric : metrics[0];
      const points: HypertablePoint[] = [];
      for (const rec of result.result.records) {
        if (String(rec.values[metricNameColumn]) !== selectedMetric) continue;
        const t = toTimestamp(rec.values[timeColumn]);
        if (t === null) continue;
        const vRaw = rec.values[valueColumn];
        if (!isNumericValue(vRaw)) continue;
        points.push({ t, v: toNumber(vRaw), raw: rec.values });
      }
      points.sort((a, b) => a.t - b.t);
      return {
        timeColumn,
        metricColumn: valueColumn,
        metrics: [ALL_METRICS, ...metrics],
        points,
        metricNameColumn,
      };
    }
  }

  const metrics = numericColumns(result, timeColumn);
  if (metrics.length === 0) return null;
  const metricColumn = metric && metrics.includes(metric) ? metric : metrics[0];
  const points: HypertablePoint[] = [];
  for (const rec of result.result.records) {
    const tRaw = rec.values[timeColumn];
    const vRaw = rec.values[metricColumn];
    const t = toTimestamp(tRaw);
    if (t === null) continue;
    if (!isNumericValue(vRaw)) continue;
    points.push({ t, v: toNumber(vRaw), raw: rec.values });
  }
  points.sort((a, b) => a.t - b.t);
  return { timeColumn, metricColumn, metrics, points, metricNameColumn: null };
}

/** Portable series choices for the Data Kit; no Kit dependency is imported. */
export function extractEventSeries(
  result: QueryResult,
): { id: string; label: string; points: HypertablePoint[] }[] {
  const first = extractSeries(result, ALL_METRICS);
  if (!first) return [];
  return first.metrics.map((id) => ({
    id,
    label: id === ALL_METRICS ? "all writes" : id,
    points: extractSeries(result, id)?.points ?? [],
  }));
}
