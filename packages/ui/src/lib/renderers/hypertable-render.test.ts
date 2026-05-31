import { describe, expect, it } from 'vitest'
import type { QueryResult } from '#reddb'
import {
  ALL_METRICS,
  chartGeometry,
  extractSeries,
  hasHypertableShape,
  numericColumns,
  pickTimeColumn,
  renderHypertableHtml,
} from './hypertable-render'

const FIXTURE: QueryResult = {
  ok: true,
  query: 'SELECT time, cpu, mem FROM metrics',
  capability: 'hypertable',
  record_count: 3,
  result: {
    columns: ['time', 'cpu', 'mem'],
    records: [
      { values: { time: '2026-01-01T00:00:00Z', cpu: 10, mem: 200 } },
      { values: { time: '2026-01-01T00:01:00Z', cpu: 20, mem: 220 } },
      { values: { time: '2026-01-01T00:02:00Z', cpu: 15, mem: 210 } },
    ],
  },
}

describe('pickTimeColumn', () => {
  it('picks the first known time-shaped column', () => {
    expect(pickTimeColumn(FIXTURE)).toBe('time')
  })

  it('returns null when no time column is found', () => {
    const r: QueryResult = {
      ok: true,
      query: '',
      record_count: 0,
      result: { columns: ['x', 'y'], records: [] },
    }
    expect(pickTimeColumn(r)).toBe(null)
  })
})

describe('numericColumns', () => {
  it('lists numeric metric columns excluding the time column', () => {
    expect(numericColumns(FIXTURE, 'time')).toEqual(['cpu', 'mem'])
  })

  it('excludes red_* internals', () => {
    const r: QueryResult = {
      ...FIXTURE,
      result: {
        columns: ['time', 'cpu', 'red_internal'],
        records: [{ values: { time: '2026-01-01T00:00:00Z', cpu: 1, red_internal: 5 } }],
      },
    }
    expect(numericColumns(r, 'time')).toEqual(['cpu'])
  })

  it('excludes system time and envelope columns from metric choices', () => {
    const r: QueryResult = {
      ...FIXTURE,
      result: {
        columns: ['timestamp', 'created_at', 'updated_at', 'timestamp_ns', 'rid', 'value'],
        records: [
          { values: { timestamp: 1, created_at: 2, updated_at: 3, timestamp_ns: 4, rid: 5, value: 9 } },
        ],
      },
    }
    expect(numericColumns(r, 'timestamp')).toEqual(['value'])
  })
})

describe('hasHypertableShape', () => {
  it('accepts a result with time + numeric metric', () => {
    expect(hasHypertableShape(FIXTURE)).toBe(true)
  })

  it('rejects a result without a time column', () => {
    const r: QueryResult = {
      ok: true,
      query: '',
      record_count: 1,
      result: { columns: ['id', 'cpu'], records: [{ values: { id: 1, cpu: 10 } }] },
    }
    expect(hasHypertableShape(r)).toBe(false)
  })
})

describe('extractSeries', () => {
  it('builds an ordered series for the default (first) metric', () => {
    const s = extractSeries(FIXTURE)!
    expect(s.timeColumn).toBe('time')
    expect(s.metricColumn).toBe('cpu')
    expect(s.metrics).toEqual(['cpu', 'mem'])
    expect(s.points.map((p) => p.v)).toEqual([10, 20, 15])
  })

  it('honors an explicit metric selection', () => {
    const s = extractSeries(FIXTURE, 'mem')!
    expect(s.metricColumn).toBe('mem')
    expect(s.points.map((p) => p.v)).toEqual([200, 220, 210])
  })

  it('treats metric/value rows as an all-writes event series by default', () => {
    const r: QueryResult = {
      ok: true,
      query: 'SELECT * FROM ingest_log',
      capability: 'hypertable',
      record_count: 3,
      result: {
        columns: ['timestamp', 'metric', 'value', 'created_at', 'tags'],
        records: [
          { values: { timestamp: 3, metric: 'queue.enqueue', value: 2, created_at: 30, tags: { phase: 'queue' } } },
          { values: { timestamp: 1, metric: 'queue.enqueue', value: 1, created_at: 10, tags: { phase: 'queue' } } },
          { values: { timestamp: 2, metric: 'graph.edge', value: 9, created_at: 20, tags: { phase: 'graph' } } },
        ],
      },
    }

    const s = extractSeries(r)!
    expect(s.metricColumn).toBe('value')
    expect(s.metricNameColumn).toBe('metric')
    expect(s.metrics).toEqual([ALL_METRICS, 'graph.edge', 'queue.enqueue'])
    expect(s.points.map((p) => p.v)).toEqual([1, 9, 2])
    expect(s.points[0].raw.tags).toEqual({ phase: 'queue' })
  })

  it('can filter metric/value rows to one named metric', () => {
    const r: QueryResult = {
      ok: true,
      query: 'SELECT * FROM ingest_log',
      capability: 'hypertable',
      record_count: 3,
      result: {
        columns: ['timestamp', 'metric', 'value', 'created_at', 'tags'],
        records: [
          { values: { timestamp: 3, metric: 'queue.enqueue', value: 2, created_at: 30, tags: { phase: 'queue' } } },
          { values: { timestamp: 1, metric: 'queue.enqueue', value: 1, created_at: 10, tags: { phase: 'queue' } } },
          { values: { timestamp: 2, metric: 'graph.edge', value: 9, created_at: 20, tags: { phase: 'graph' } } },
        ],
      },
    }

    const s = extractSeries(r, 'queue.enqueue')!
    expect(s.metrics).toEqual([ALL_METRICS, 'graph.edge', 'queue.enqueue'])
    expect(s.points.map((p) => p.v)).toEqual([1, 2])
  })
})

describe('chartGeometry', () => {
  it('emits a monotonic path string with N segments', () => {
    const s = extractSeries(FIXTURE)!
    const g = chartGeometry(s)!
    expect(g.path.startsWith('M')).toBe(true)
    const moves = g.path.match(/[ML]/g) ?? []
    expect(moves).toHaveLength(3)
  })
})

describe('renderHypertableHtml (golden snapshot)', () => {
  it('matches the captured snapshot for the fixture', () => {
    expect(renderHypertableHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<section class="hypertable"><header class="summary">3 pts · metric <code>cpu</code></header><svg viewBox="0 0 640 180" class="chart"><path d="M16.00,164.00 L320.00,16.00 L624.00,90.00" /></svg></section>"`,
    )
  })
})
