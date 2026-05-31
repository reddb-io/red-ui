import { describe, expect, it } from 'vitest'
import type { QueryResult } from '#reddb'
import { extractStats, formatMetric, hasStatsShape } from './stats-render'

function result(records: QueryResult['result']['records'], capability?: string): QueryResult {
  return { ok: true, query: '', capability, record_count: records.length, result: { columns: [], records } }
}

describe('stats renderer helpers', () => {
  it('extracts metric/value rows with inferred units', () => {
    const metrics = extractStats(result([
      { values: { metric: 'response_ms', value: 12 } },
      { values: { name: 'storage_bytes', count: 2048 } },
    ]))
    expect(metrics.map((m) => [m.label, m.value, m.unit])).toEqual([
      ['response_ms', 12, 'ms'],
      ['storage_bytes', 2048, 'bytes'],
    ])
    expect(formatMetric(2048, 'bytes')).toBe('2.0 KiB')
  })

  it('prefers explicit unit columns for metric rows', () => {
    const metrics = extractStats(result([
      { values: { name: 'avg_review_rating', value: 4.4, unit: 'score' } },
      { values: { name: 'villain_tale_ratio', value: 28, units: 'percent' } },
    ]))
    expect(metrics.map((m) => [m.label, m.value, m.unit])).toEqual([
      ['avg_review_rating', 4.4, 'score'],
      ['villain_tale_ratio', 28, 'percent'],
    ])
  })

  it('claims explicit stats capability', () => {
    expect(hasStatsShape(result([], 'stats'))).toBe(true)
  })
})
