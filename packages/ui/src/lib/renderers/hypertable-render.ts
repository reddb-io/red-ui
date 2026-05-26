// Pure rendering helpers for the hypertable capability.
//
// Hypertable result = at least one time-shaped column and one numeric
// column. The renderer draws an SVG line chart over the time axis with
// a small data table below for inspection. The metric switcher in the
// component lets the user flip between numeric columns when there are
// several; this module exposes the data shape so the test can assert
// the chart geometry without a browser.

import type { QueryResult } from '@red-ui/protocol'

const TIME_KEYS = ['time', 'timestamp', 'ts', 'created_at', 'event_time', 'bucket']

export interface HypertablePoint {
  t: number
  v: number
  raw: { t: unknown; v: unknown }
}

export interface HypertableSeries {
  timeColumn: string
  metricColumn: string
  metrics: string[]
  points: HypertablePoint[]
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
    points.push({ t, v: toNumber(vRaw), raw: { t: tRaw, v: vRaw } })
  }
  points.sort((a, b) => a.t - b.t)
  return { timeColumn, metricColumn, metrics, points }
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
