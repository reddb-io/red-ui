// Analytics v0 surface: metric descriptors (`red.metrics`) + the Prometheus
// HTTP query adapter (`/api/v1/query[_range]`), plus the bridge the UI needs:
// given a metric's *kind*, what chart shows it honestly.
//
// Pinned against reddb source (2026-06):
//   - descriptor catalog columns: crates/reddb-server/src/runtime/red_schema.rs (red.metrics, #747)
//   - PromQL envelope + subset: docs/operations/metrics-compatibility.md (ADR 0017)
//
// Premise (the user's): if we know the *nature* of a metric, we know the
// chart. A counter is a rate line, a gauge is a point-in-time gauge, a
// histogram is a P50/P95/P99 percentile curve. `chartKindForMetric` encodes
// exactly that, and `promQLForMetric` builds the matching query.

/** Metric kinds reddb's descriptor catalog validates (immutable per metric). */
export type MetricKind =
  | "counter"
  | "gauge"
  | "histogram"
  | "ratio"
  | "derived";

/** `role` tags the metric's intent — drives grouping, not chart choice. */
export type MetricRole = "metric" | "operational" | "kpi" | "sli" | string;

/** One row of `red.metrics` (the typed descriptor projection, #747). */
export interface MetricDescriptor {
  path: string;
  kind: MetricKind;
  role: MetricRole;
  /** Reserved in v0 (NULL until the catalog tracks it). */
  unit?: string | null;
  labels?: Record<string, unknown> | null;
  retention_ms?: number | null;
  supports_prometheus_query?: boolean;
  created_at_ms?: number;
}

/** The chart family the UI renders for a metric. */
export type ChartKind =
  | "line" // counter rate / derived series over time
  | "area" // gauge over time
  | "gauge" // gauge / ratio point-in-time dial
  | "percentiles" // histogram → P50/P95/P99 curves
  | "bars"; // fallback categorical

/**
 * Map a metric's nature to its chart. This is the heart of eixo 3: the UI
 * never asks the user "what chart?" — the descriptor's `kind` decides.
 */
export function chartKindForMetric(kind: MetricKind): ChartKind {
  switch (kind) {
    case "counter":
      return "line"; // rate() over time
    case "gauge":
      return "area"; // point-in-time level, filled
    case "histogram":
      return "percentiles"; // P50/P95/P99 via histogram_quantile
    case "ratio":
      return "gauge"; // 0..1 dial
    case "derived":
      return "line";
    default:
      return "line";
  }
}

// ── Prometheus HTTP API envelopes (standard shapes) ──────────────────────────

/** A single `[unixSeconds, "value"]` sample (Prometheus encodes value as a string). */
export type PromSample = [number, string];

export interface PromVectorEntry {
  metric: Record<string, string>;
  value: PromSample;
}

export interface PromMatrixEntry {
  metric: Record<string, string>;
  values: PromSample[];
}

export interface PromResponse {
  status: "success" | "error";
  data?: {
    resultType: "vector" | "matrix" | "scalar" | "string";
    result: PromVectorEntry[] | PromMatrixEntry[];
  };
  errorType?: string;
  error?: string;
}

/** A normalised time-series point the chart layer consumes. */
export interface SeriesPoint {
  /** epoch milliseconds */
  t: number;
  v: number;
}

export interface NormalizedSeries {
  /** A short stable label built from the series' distinguishing labels. */
  label: string;
  labels: Record<string, string>;
  points: SeriesPoint[];
}

function seriesLabel(metric: Record<string, string>): string {
  const name = metric.__name__;
  const rest = Object.entries(metric)
    .filter(([k]) => k !== "__name__")
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  if (name && rest) return `${name}{${rest}}`;
  if (rest) return `{${rest}}`;
  return name ?? "series";
}

function toPoint(sample: PromSample): SeriesPoint | null {
  const v = Number(sample[1]);
  if (!Number.isFinite(v)) return null; // Prometheus emits "NaN" for gaps
  return { t: sample[0] * 1000, v };
}

/** Normalise a `query_range` (matrix) response into chartable series. */
export function parsePromMatrix(resp: PromResponse): NormalizedSeries[] {
  if (resp.status !== "success" || resp.data?.resultType !== "matrix")
    return [];
  return (resp.data.result as PromMatrixEntry[]).map((entry) => ({
    label: seriesLabel(entry.metric),
    labels: entry.metric,
    points: entry.values
      .map(toPoint)
      .filter((p): p is SeriesPoint => p !== null),
  }));
}

/** Normalise an instant (vector) response into one point per series. */
export function parsePromVector(resp: PromResponse): NormalizedSeries[] {
  if (resp.status !== "success" || resp.data?.resultType !== "vector")
    return [];
  return (resp.data.result as PromVectorEntry[])
    .map((entry) => {
      const point = toPoint(entry.value);
      return point
        ? {
            label: seriesLabel(entry.metric),
            labels: entry.metric,
            points: [point],
          }
        : null;
    })
    .filter((s): s is NormalizedSeries => s !== null);
}

/** A PromQL expression plus the label it should be charted under. */
export interface MetricQuery {
  label: string;
  expr: string;
}

export interface MetricQueryPlan {
  chart: ChartKind;
  /** Range vector window for rate()/histogram_quantile(), e.g. "5m". */
  window: string;
  /** One expr for simple metrics; three (p50/p95/p99) for histograms. */
  queries: MetricQuery[];
}

const PERCENTILES: Array<{ label: string; phi: number }> = [
  { label: "p50", phi: 0.5 },
  { label: "p95", phi: 0.95 },
  { label: "p99", phi: 0.99 },
];

/**
 * Build the PromQL query plan for a descriptor. Honours the v0 subset
 * documented in metrics-compatibility.md:
 *   - counter → `rate(<path>[w])`
 *   - histogram → `histogram_quantile(phi, sum by (le) (rate(<path>_bucket[w])))` ×3
 *   - gauge / ratio / derived → bare `<path>`
 */
export function promQLForMetric(
  descriptor: Pick<MetricDescriptor, "path" | "kind">,
  opts: { window?: string } = {}
): MetricQueryPlan {
  const window = opts.window ?? "5m";
  const path = descriptor.path;
  const chart = chartKindForMetric(descriptor.kind);

  if (descriptor.kind === "histogram") {
    return {
      chart,
      window,
      queries: PERCENTILES.map(({ label, phi }) => ({
        label,
        expr: `histogram_quantile(${phi}, sum by (le) (rate(${path}_bucket[${window}])))`,
      })),
    };
  }
  if (descriptor.kind === "counter") {
    return {
      chart,
      window,
      queries: [{ label: path, expr: `rate(${path}[${window}])` }],
    };
  }
  // gauge | ratio | derived — read the level directly.
  return { chart, window, queries: [{ label: path, expr: path }] };
}
