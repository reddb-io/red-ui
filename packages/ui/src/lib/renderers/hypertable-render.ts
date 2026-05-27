// Pure rendering helpers for the hypertable capability.
//
// Hypertable result = at least one time-shaped column and one numeric
// column. The renderer draws an SVG line chart over the time axis with
// a small data table below for inspection. The metric switcher in the
// component lets the user flip between numeric columns when there are
// several; this module exposes the data shape so the test can assert
// the chart geometry without a browser.

import type { QueryResult } from '@red-ui/protocol'

export const ALL_METRICS = '__all__'

const TIME_KEYS = ['time', 'timestamp', 'ts', 'event_time', 'bucket', 'created_at']
const SYSTEM_NUMERIC_KEYS = new Set([
  'created_at',
  'updated_at',
  'time',
  'timestamp',
  'timestamp_ns',
  'rid',
  'tenant',
])

export interface HypertablePoint {
  t: number
  v: number
  raw: Record<string, unknown>
}

export interface HypertableSeries {
  timeColumn: string
  metricColumn: string
  metrics: string[]
  points: HypertablePoint[]
  metricNameColumn: string | null
}

export const CHART_WIDTH = 640
export const CHART_HEIGHT = 180
export const CHART_PADDING = 16

function isNumericValue(v: unknown): v is number {
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n)
  }
  return false
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  return Number(v)
}

function toTimestamp(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
    const d = Date.parse(v)
    return Number.isNaN(d) ? null : d
  }
  return null
}

export function pickTimeColumn(result: QueryResult): string | null {
  const cols = result.result?.columns ?? []
  for (const key of TIME_KEYS) {
    const found = cols.find((c) => c.toLowerCase() === key)
    if (found) return found
  }
  const records = result.result?.records ?? []
  if (records.length === 0) return null
  // Fallback: any column whose first non-null value parses as a date.
  for (const c of cols) {
    const sample = records.find((r) => r.values[c] !== null && r.values[c] !== undefined)
    if (!sample) continue
    if (toTimestamp(sample.values[c]) !== null && !isNumericValue(sample.values[c])) {
      return c
    }
  }
  return null
}

export function numericColumns(result: QueryResult, exclude: string | null): string[] {
  const cols = result.result?.columns ?? []
  const records = result.result?.records ?? []
  if (records.length === 0) return []
  const out: string[] = []
  for (const c of cols) {
    if (c === exclude) continue
    if (c.startsWith('red_')) continue
    if (SYSTEM_NUMERIC_KEYS.has(c.toLowerCase())) continue
    const sample = records.find((r) => r.values[c] !== null && r.values[c] !== undefined)
    if (!sample) continue
    if (isNumericValue(sample.values[c])) out.push(c)
  }
  return out
}

export function hasHypertableShape(result: QueryResult): boolean {
  const t = pickTimeColumn(result)
  if (!t) return false
  return numericColumns(result, t).length > 0
}

export function extractSeries(
  result: QueryResult,
  metric?: string,
): HypertableSeries | null {
  const timeColumn = pickTimeColumn(result)
  if (!timeColumn) return null
  const metricNameColumn = result.result.columns.find((c) => c.toLowerCase() === 'metric') ?? null
  const valueColumn = result.result.columns.find((c) => c.toLowerCase() === 'value') ?? null
  if (metricNameColumn && valueColumn) {
    const names = new Set<string>()
    const allPoints: HypertablePoint[] = []
    for (const rec of result.result.records) {
      const name = rec.values[metricNameColumn]
      const value = rec.values[valueColumn]
      if ((typeof name === 'string' || typeof name === 'number') && isNumericValue(value)) {
        names.add(String(name))
        const t = toTimestamp(rec.values[timeColumn])
        if (t !== null) allPoints.push({ t, v: toNumber(value), raw: rec.values })
      }
    }
    const metrics = [...names].sort()
    if (metrics.length > 0) {
      if (!metric || metric === ALL_METRICS) {
        allPoints.sort((a, b) => a.t - b.t)
        return {
          timeColumn,
          metricColumn: valueColumn,
          metrics: [ALL_METRICS, ...metrics],
          points: allPoints,
          metricNameColumn,
        }
      }
      const selectedMetric = metrics.includes(metric) ? metric : metrics[0]
      const points: HypertablePoint[] = []
      for (const rec of result.result.records) {
        if (String(rec.values[metricNameColumn]) !== selectedMetric) continue
        const t = toTimestamp(rec.values[timeColumn])
        if (t === null) continue
        const vRaw = rec.values[valueColumn]
        if (!isNumericValue(vRaw)) continue
        points.push({ t, v: toNumber(vRaw), raw: rec.values })
      }
      points.sort((a, b) => a.t - b.t)
      return { timeColumn, metricColumn: valueColumn, metrics: [ALL_METRICS, ...metrics], points, metricNameColumn }
    }
  }

  const metrics = numericColumns(result, timeColumn)
  if (metrics.length === 0) return null
  const metricColumn = metric && metrics.includes(metric) ? metric : metrics[0]
  const points: HypertablePoint[] = []
  for (const rec of result.result.records) {
    const tRaw = rec.values[timeColumn]
    const vRaw = rec.values[metricColumn]
    const t = toTimestamp(tRaw)
    if (t === null) continue
    if (!isNumericValue(vRaw)) continue
    points.push({ t, v: toNumber(vRaw), raw: rec.values })
  }
  points.sort((a, b) => a.t - b.t)
  return { timeColumn, metricColumn, metrics, points, metricNameColumn: null }
}

export interface ChartGeometry {
  width: number
  height: number
  padding: number
  path: string
  minT: number
  maxT: number
  minV: number
  maxV: number
}

export function chartGeometry(
  series: HypertableSeries,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
  padding = CHART_PADDING,
): ChartGeometry | null {
  const pts = series.points
  if (pts.length === 0) return null
  const minT = pts[0].t
  const maxT = pts[pts.length - 1].t
  let minV = Infinity
  let maxV = -Infinity
  for (const p of pts) {
    if (p.v < minV) minV = p.v
    if (p.v > maxV) maxV = p.v
  }
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return null
  const spanT = maxT - minT || 1
  const spanV = maxV - minV || 1
  const w = width - padding * 2
  const h = height - padding * 2
  const segments: string[] = []
  pts.forEach((p, i) => {
    const x = padding + ((p.t - minT) / spanT) * w
    const y = padding + h - ((p.v - minV) / spanV) * h
    segments.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
  })
  return {
    width,
    height,
    padding,
    path: segments.join(' '),
    minT,
    maxT,
    minV,
    maxV,
  }
}

export interface BucketPoint {
  /** Bucket start in epoch ms. */
  t: number
  /** Number of points falling into this bucket. */
  count: number
  /** Sum of metric values in this bucket. */
  sum: number
}

/**
 * Bucket a series into fixed-size windows (default 1 minute). Returns
 * one BucketPoint per bucket *between* minT and maxT inclusive — empty
 * buckets get count=0 so the bar chart shows gaps in writes instead of
 * collapsing them. The user goal is "writes per minute": a bucket whose
 * count is 0 is meaningful information.
 */
export function bucketSeries(series: HypertableSeries, bucketMs = 60_000): BucketPoint[] {
  if (series.points.length === 0) return []
  const firstT = series.points[0].t
  const lastT = series.points[series.points.length - 1].t
  const start = Math.floor(firstT / bucketMs) * bucketMs
  const end = Math.floor(lastT / bucketMs) * bucketMs
  const buckets = new Map<number, BucketPoint>()
  for (let t = start; t <= end; t += bucketMs) {
    buckets.set(t, { t, count: 0, sum: 0 })
  }
  for (const p of series.points) {
    const key = Math.floor(p.t / bucketMs) * bucketMs
    const b = buckets.get(key)
    if (!b) continue
    b.count += 1
    b.sum += p.v
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t)
}

export interface BucketGeometry {
  width: number
  height: number
  padding: number
  bars: { x: number; y: number; w: number; h: number; bucket: BucketPoint }[]
  maxCount: number
}

export function bucketGeometry(
  buckets: BucketPoint[],
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
  padding = CHART_PADDING,
): BucketGeometry | null {
  if (buckets.length === 0) return null
  const maxCount = buckets.reduce((m, b) => Math.max(m, b.count), 0)
  if (maxCount === 0) return null
  const w = width - padding * 2
  const h = height - padding * 2
  // Leave a 1-px gutter between bars so dense traces still read as bars.
  const slot = w / buckets.length
  const barWidth = Math.max(1, slot - 1)
  const bars = buckets.map((bucket, i) => {
    const ratio = bucket.count / maxCount
    const barH = ratio * h
    return {
      x: padding + i * slot,
      y: padding + h - barH,
      w: barWidth,
      h: barH,
      bucket,
    }
  })
  return { width, height, padding, bars, maxCount }
}

export function renderHypertableHtml(result: QueryResult, metric?: string): string {
  const series = extractSeries(result, metric)
  if (!series) return '<section class="hypertable empty">No timeseries shape detected.</section>'
  const geom = chartGeometry(series)
  const lines: string[] = []
  lines.push('<section class="hypertable">')
  lines.push(
    `<header class="summary">${series.points.length} pts · metric <code>${escapeHtml(series.metricColumn)}</code></header>`,
  )
  if (geom) {
    lines.push(
      `<svg viewBox="0 0 ${geom.width} ${geom.height}" class="chart"><path d="${geom.path}" /></svg>`,
    )
  }
  lines.push('</section>')
  return lines.join('')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
