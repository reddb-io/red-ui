import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@red-ui/protocol'
import { extractDocuments, hasDocumentShape } from './document-render'

function result(records: QueryResult['result']['records'], capability?: string): QueryResult {
  return { ok: true, query: '', capability, record_count: records.length, result: { columns: [], records } }
}

describe('document renderer helpers', () => {
  it('extracts document body, flattened fields, and display labels', () => {
    const docs = extractDocuments(result([
      {
        values: {
          rid: 101,
          collection: 'grimm_runbooks',
          kind: 'document',
          created_at: 1,
          updated_at: 2,
          body: {
            title: 'Queue replay',
            category: 'ops',
            nested: { ok: true },
          },
          title: 'Queue replay',
          category: 'ops',
          nested: { ok: true },
        },
      },
    ]))

    expect(docs).toHaveLength(1)
    expect(docs[0].rid).toBe('101')
    expect(docs[0].title).toBe('Queue replay')
    expect(docs[0].subtitle).toContain('ops')
    expect(docs[0].fields).toEqual({
      title: 'Queue replay',
      category: 'ops',
      nested: { ok: true },
    })
  })

  it('claims explicit document capability and document-shaped rows', () => {
    expect(hasDocumentShape(result([], 'document'))).toBe(true)
    expect(hasDocumentShape(result([{ values: { kind: 'document', body: { title: 'Doc' } } }]))).toBe(true)
    expect(hasDocumentShape(result([{ values: { id: 1, title: 'table row' } }]))).toBe(false)
  })
})
