import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@red-ui/protocol'
import {
  buildVectorSearchQuery,
  extractVectors,
  formatVectorLiteral,
  hasVectorShape,
  isSyntheticVectorPreview,
  isVectorSearchResult,
  parseVectorInput,
  scalarLabel,
  vectorMagnitude,
} from './vector-render'

function result(records: QueryResult['result']['records'], capability?: string): QueryResult {
  return { ok: true, query: '', capability, record_count: records.length, result: { columns: [], records } }
}

describe('vector renderer helpers', () => {
  it('extracts vector, scalar, and metadata fields', () => {
    const rows = extractVectors(result([
      { values: { rid: 7, embedding: [3, 4], distance: 0.2, title: 'doc' } },
    ]))
    expect(rows[0]).toMatchObject({
      id: '7',
      vectorColumn: 'embedding',
      vector: [3, 4],
      dimension: 2,
      scalarColumn: 'distance',
      scalar: 0.2,
      metadata: { title: 'doc' },
    })
    expect(vectorMagnitude(rows[0].vector)).toBe(5)
    expect(scalarLabel(rows[0])).toBe('search distance · distance')
  })

  it('claims explicit vector capability even when the result is empty', () => {
    expect(hasVectorShape(result([], 'vector'))).toBe(true)
  })

  it('uses declared dimension when RedDB does not return vector coordinates', () => {
    const rows = extractVectors(result([
      { values: { entity_id: 42, content: 'doc', dimension: 3, score: 0.98 } },
    ]))

    expect(rows[0]).toMatchObject({
      id: '42',
      vector: [],
      dimension: 3,
      scalarColumn: 'score',
      scalar: 0.98,
      metadata: { content: 'doc' },
    })
  })

  it('extracts vectors from vector_results when the backend includes them', () => {
    const rows = extractVectors(result([
      {
        values: { entity_id: 42, distance: 0.1, dimension: 3 },
        vector_results: [{ id: 42, collection: 'docs', distance: 0.1, vector: [1, 2, 3] }],
      },
    ]))

    expect(rows[0]).toMatchObject({
      vectorColumn: 'vector_results.vector',
      vector: [1, 2, 3],
      dimension: 3,
      scalarColumn: 'distance',
      scalar: 0.1,
    })
  })

  it('labels the automatic vector preview query as synthetic', () => {
    expect(isSyntheticVectorPreview({
      ...result([]),
      query: 'VECTOR SEARCH motif_vectors SIMILAR TO [1.0, 0.0, 0.0] INCLUDE VECTORS LIMIT 200',
    })).toBe(true)
    expect(isSyntheticVectorPreview({
      ...result([]),
      query: 'VECTOR SEARCH motif_vectors SIMILAR TO [0.1, 0.2] LIMIT 10',
    })).toBe(false)
    expect(isVectorSearchResult({
      ...result([]),
      query: 'VECTOR SEARCH motif_vectors SIMILAR TO [0.1, 0.2] LIMIT 10',
    })).toBe(true)
  })

  it('parses and formats user supplied vectors without changing dimensionality', () => {
    expect(parseVectorInput('[3, 4, 0]')).toEqual([3, 4, 0])
    expect(formatVectorLiteral([0.123456789, 1])).toBe('[0.12345679, 1]')
  })

  it('builds RedDB-side vector search queries for text and numeric vectors', () => {
    expect(buildVectorSearchQuery('motif_vectors', { kind: 'text', text: "lost child" }, 20))
      .toBe("VECTOR SEARCH motif_vectors SIMILAR TO 'lost child' INCLUDE VECTORS LIMIT 20")
    expect(buildVectorSearchQuery('motif_vectors', { kind: 'text', text: "wolf's forest" }, 500))
      .toBe("VECTOR SEARCH motif_vectors SIMILAR TO 'wolf''s forest' INCLUDE VECTORS LIMIT 200")
    expect(buildVectorSearchQuery('motif_vectors', { kind: 'vector', vector: [0.1, 0.2] }, 5))
      .toBe('VECTOR SEARCH motif_vectors SIMILAR TO [0.1, 0.2] INCLUDE VECTORS LIMIT 5')
  })
})
