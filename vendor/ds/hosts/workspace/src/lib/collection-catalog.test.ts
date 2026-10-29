import { describe, expect, it } from 'vitest'
import {
  collectionCatalogBadges,
  collectionCatalogFromRow,
  collectionCatalogQuery,
  formatBytes,
  formatCount,
  formatDurationMs,
} from './collection-catalog'

describe('collection catalog helpers', () => {
  it('builds the red.collections lookup query safely', () => {
    expect(collectionCatalogQuery("docs'prod")).toContain("WHERE name = 'docs''prod'")
  })

  it('maps red.collections rows into UI metadata', () => {
    const meta = collectionCatalogFromRow({
      values: {
        name: 'motif_vectors',
        model: 'vector',
        schema_mode: 'semi_structured',
        entities: 10,
        segments: 1,
        indices: 2,
        in_memory_bytes: 0,
        on_disk_bytes: 12288,
        internal: false,
        dimension: 224,
        metric: 'cosine',
      },
    })

    expect(meta).toMatchObject({
      name: 'motif_vectors',
      model: 'vector',
      schemaMode: 'semi_structured',
      entities: 10,
      onDiskBytes: 12288,
      dimension: 224,
      metric: 'cosine',
    })
    expect(collectionCatalogBadges(meta!)).toEqual(['semi_structured', '224d', 'cosine'])
  })

  it('formats compact executive values', () => {
    expect(formatCount(51118)).toBe('51,118')
    expect(formatBytes(12288)).toBe('12.0 KiB')
    expect(formatDurationMs(90_000)).toBe('1.5 min')
  })
})
