export const ALL_METRICS = "__all__";
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
export interface EventSeries {
  id: string;
  label: string;
  points: readonly HypertablePoint[];
}
export const CHART_WIDTH = 640,
  CHART_HEIGHT = 180,
  CHART_PADDING = 16;
/** Keep valid observations ordered without changing caller-owned arrays. */
export function normalizeEventPoints(
  points: readonly HypertablePoint[],
): HypertablePoint[] {
  return points
    .filter(
      (point) =>
        Number.isFinite(point.t) &&
        Math.abs(point.t) <= 8.64e15 &&
        Number.isFinite(point.v),
    )
    .slice()
    .sort((a, b) => a.t - b.t);
}
/** Bound allocations while retaining empty intervals between observed events. */
export function effectiveBucketMs(
  points: readonly HypertablePoint[],
  requested: number,
): number {
  const size = Number.isFinite(requested) && requested >= 1 ? requested : 60000;
  const ordered = normalizeEventPoints(points);
  const first = ordered[0]?.t ?? 0,
    last = ordered.at(-1)?.t ?? first;
  return Math.max(size, Math.ceil((last - first) / size / 2047) * size);
}
export interface ChartGeometry {
  width: number;
  height: number;
  padding: number;
  path: string;
  minT: number;
  maxT: number;
  minV: number;
  maxV: number;
}

export function chartGeometry(
  series: HypertableSeries,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
  padding = CHART_PADDING,
): ChartGeometry | null {
  const pts = series.points;
  if (pts.length === 0) return null;
  const minT = pts[0]!.t;
  const maxT = pts[pts.length - 1]!.t;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of pts) {
    if (p.v < minV) minV = p.v;
    if (p.v > maxV) maxV = p.v;
  }
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return null;
  const spanT = maxT - minT || 1;
  const spanV = maxV - minV || 1;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const segments: string[] = [];
  pts.forEach((p, i) => {
    const x = padding + ((p.t - minT) / spanT) * w;
    const y = padding + h - ((p.v - minV) / spanV) * h;
    segments.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  });
  return {
    width,
    height,
    padding,
    path: segments.join(" "),
    minT,
    maxT,
    minV,
    maxV,
  };
}

export interface BucketPoint {
  /** Bucket start in epoch ms. */
  t: number;
  /** Number of points falling into this bucket. */
  count: number;
  /** Sum of metric values in this bucket. */
  sum: number;
}

/**
 * Bucket a series into fixed-size windows (default 1 minute). Returns
 * one BucketPoint per bucket *between* minT and maxT inclusive — empty
 * buckets get count=0 so the bar chart shows gaps in writes instead of
 * collapsing them. The user goal is "writes per minute": a bucket whose
 * count is 0 is meaningful information.
 */
export function bucketSeries(
  series: HypertableSeries,
  bucketMs = 60_000,
): BucketPoint[] {
  series = { ...series, points: normalizeEventPoints(series.points) };
  bucketMs = effectiveBucketMs(series.points, bucketMs);
  if (series.points.length === 0) return [];
  const firstT = series.points[0]!.t;
  const lastT = series.points[series.points.length - 1]!.t;
  const start = Math.floor(firstT / bucketMs) * bucketMs;
  const end = Math.floor(lastT / bucketMs) * bucketMs;
  const buckets = new Map<number, BucketPoint>();
  for (let t = start; t <= end; t += bucketMs) {
    buckets.set(t, { t, count: 0, sum: 0 });
  }
  for (const p of series.points) {
    const key = Math.floor(p.t / bucketMs) * bucketMs;
    const b = buckets.get(key);
    if (!b) continue;
    b.count += 1;
    b.sum += p.v;
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

export interface BucketGeometry {
  width: number;
  height: number;
  padding: number;
  bars: { x: number; y: number; w: number; h: number; bucket: BucketPoint }[];
  maxCount: number;
}

export function bucketGeometry(
  buckets: BucketPoint[],
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
  padding = CHART_PADDING,
): BucketGeometry | null {
  if (buckets.length === 0) return null;
  const maxCount = buckets.reduce((m, b) => Math.max(m, b.count), 0);
  if (maxCount === 0) return null;
  const w = width - padding * 2;
  const h = height - padding * 2;
  // Leave a 1-px gutter between bars so dense traces still read as bars.
  const slot = w / buckets.length;
  const barWidth = Math.max(1, slot - 1);
  const bars = buckets.map((bucket, i) => {
    const ratio = bucket.count / maxCount;
    const barH = ratio * h;
    return {
      x: padding + i * slot,
      y: padding + h - barH,
      w: barWidth,
      h: barH,
      bucket,
    };
  });
  return { width, height, padding, bars, maxCount };
}

export function formatEventTime(t: number): string {
  const date = new Date(t);
  return Number.isFinite(date.getTime())
    ? date.toISOString().replace("T", " ").slice(0, 19)
    : String(t);
}
export function eventPayload(raw: Record<string, unknown>): string {
  const parts: string[] = [];
  if (raw.metric !== undefined) parts.push(String(raw.metric));
  if (raw.tags && typeof raw.tags === "object")
    parts.push(
      Object.entries(raw.tags)
        .map(
          ([key, value]) =>
            `${key}=${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
        )
        .join(" "),
    );
  const value = raw.event ?? raw.action ?? raw.message ?? raw.payload;
  if (value !== undefined)
    parts.push(
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  return parts.filter(Boolean).join(" · ");
}
export const bucketOptions = [1000, 10000, 60000, 300000, 600000, 3600000];
export function bucketLabel(ms: number): string {
  return ms < 60000
    ? `${ms / 1000}s`
    : ms < 3600000
      ? `${ms / 60000}min`
      : `${ms / 3600000}hr`;
}
export function seriesBuckets(
  points: readonly HypertablePoint[],
  ms: number,
): BucketPoint[] {
  return bucketSeries(
    {
      points: [...points],
      timeColumn: "",
      metricColumn: "",
      metrics: [],
      metricNameColumn: null,
    },
    ms,
  );
}

export function renderEventSeriesSnapshot(
  series: HypertableSeries | null,
): string {
  if (!series)
    return '<section class="hypertable empty">No timeseries shape detected.</section>';
  const geom = chartGeometry(series);
  const lines: string[] = [];
  lines.push('<section class="hypertable">');
  lines.push(
    `<header class="summary">${series.points.length} pts · metric <code>${escapeHtml(series.metricColumn)}</code></header>`,
  );
  if (geom) {
    lines.push(
      `<svg viewBox="0 0 ${geom.width} ${geom.height}" class="chart"><path d="${geom.path}" /></svg>`,
    );
  }
  lines.push("</section>");
  return lines.join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
