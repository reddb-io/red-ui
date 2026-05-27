import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@red-ui/protocol'
import { extractDiffEntries, formatDiffValue, hasDiffShape, summarizeDiff } from './diff-render'

function result(records: QueryResult['result']['records'], capability?: string): QueryResult {
  return { ok: true, query: '', capability, record_count: records.length, result: { columns: [], records } }
}

describe('diff renderer helpers', () => {
  it('extracts before and after rows from vcs-shaped records', () => {
    const r = result([
      { values: { id: 'd1', target_collection: 'tale_taxonomy', change: 'modified', entity_id: 'cinderella', before_state: '{"risk":2}', after_state: '{"risk":1}' } },
    ])
    expect(hasDiffShape(r)).toBe(true)
    expect(extractDiffEntries(r)[0]).toMatchObject({
      id: 'd1',
      change: 'modified',
      collection: 'tale_taxonomy',
      entityId: 'cinderella',
      before: { risk: 2 },
      after: { risk: 1 },
    })
  })

  it('summarizes by change kind', () => {
    const summary = summarizeDiff(extractDiffEntries(result([
      { values: { change: 'added', after: '{}' } },
      { values: { change: 'added', after: '{}' } },
      { values: { change: 'removed', before: '{}' } },
    ])))
    expect(summary).toEqual([['added', 2], ['removed', 1]])
    expect(formatDiffValue({ a: 1 })).toBe('{\n  "a": 1\n}')
  })
})
