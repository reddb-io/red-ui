import type { QueryResult } from '@red-ui/protocol'

export interface StatMetric {
  key: string
  label: string
  value: number
  unit: string
  source: Record<string, unknown>
}

const NAME_COLUMNS = ['metric', 'stat', 'name', 'key']
const VALUE_COLUMNS = ['value', 'count', 'total', 'avg', 'rate', 'p50', 'p95', 'p99']
const UNIT_COLUMNS = ['unit', 'units']

function unitFor(key: string): string {
  if (/bytes?|memory|storage|wal/i.test(key)) return 'bytes'
  if (/rps|rate|requests?_per_second|writes?_per_second|reads?_per_second/i.test(key)) return '/s'
  if (/ms|latency|response/i.test(key)) return 'ms'
  if (/percent|ratio|usage/i.test(key)) return '%'
  return ''
}

function explicitUnit(values: Record<string, unknown>): string | null {
  for (const column of UNIT_COLUMNS) {
    const value = values[column]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  const entry = Object.entries(values).find(([k, v]) =>
    UNIT_COLUMNS.includes(k.toLowerCase()) && typeof v === 'string' && v.trim(),
  )
  return entry ? String(entry[1]).trim() : null
}

export function extractStats(result: QueryResult): StatMetric[] {
  const metrics: StatMetric[] = []
  for (const record of result.result.records) {
    const values = record.values ?? {}
    const nameEntry = Object.entries(values).find(([k, v]) =>
      NAME_COLUMNS.includes(k.toLowerCase()) && (typeof v === 'string' || typeof v === 'number'),
    )
    const valueEntry = Object.entries(values).find(([k, v]) =>
      VALUE_COLUMNS.includes(k.toLowerCase()) && typeof v === 'number' && Number.isFinite(v),
    )
    if (nameEntry && valueEntry) {
      const label = String(nameEntry[1])
      metrics.push({ key: label, label, value: valueEntry[1] as number, unit: explicitUnit(values) ?? unitFor(label), source: values })
      continue
    }
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      metrics.push({ key, label: key, value, unit: unitFor(key), source: values })
    }
  }
  return metrics
}

export function hasStatsShape(result: QueryResult): boolean {
  if (result.capability === 'stats') return true
  const metrics = extractStats(result)
  return metrics.length > 0 && metrics.length >= result.result.records.length
}

export function formatMetric(value: number, unit: string): string {
  if (unit === 'bytes') {
    const abs = Math.abs(value)
    if (abs >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`
    if (abs >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`
    if (abs >= 1024) return `${(value / 1024).toFixed(1)} KiB`
    return `${value} B`
  }
  if (unit === '%' || unit === 'ms' || unit === '/s') return `${value.toLocaleString()}${unit}`
  return value.toLocaleString()
}
