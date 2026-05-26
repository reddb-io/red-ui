import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@red-ui/protocol'
import { extractGraph, hasGraphShape, renderGraphHtml } from './graph-render'

const FIXTURE: QueryResult = {
  ok: true,
  query: 'MATCH (n)-[r]->(m) RETURN n, r, m',
  capability: 'graph',
  record_count: 2,
  result: {
    columns: ['n', 'r', 'm'],
    records: [
      {
        values: {},
        nodes: {
          n: { id: '1', name: 'Ada' },
          m: { id: '2', name: 'Grace' },
        },
        edges: {
          r: { source: '1', target: '2', type: 'KNOWS' },
        },
      },
      {
        values: {},
        nodes: {
          n: { id: '1', name: 'Ada' },
          m: { id: '3', name: 'Linus' },
        },
        edges: {
          r: { source: '1', target: '3', type: 'KNOWS' },
        },
      },
    ],
  },
}

describe('hasGraphShape', () => {
  it('detects results with nodes/edges populated', () => {
    expect(hasGraphShape(FIXTURE)).toBe(true)
  })

  it('rejects plain table results', () => {
    const flat: QueryResult = {
      ok: true,
      query: 'SELECT * FROM users',
      record_count: 1,
      result: { columns: ['id'], records: [{ values: { id: 1 } }] },
    }
    expect(hasGraphShape(flat)).toBe(false)
  })

  it('rejects empty results', () => {
    const empty: QueryResult = {
      ok: true,
      query: '',
      record_count: 0,
      result: { columns: [], records: [] },
    }
    expect(hasGraphShape(empty)).toBe(false)
  })
})

describe('extractGraph', () => {
  it('dedupes nodes by id across rows', () => {
    const { nodes, edges } = extractGraph(FIXTURE)
    expect(nodes.map((n) => n.id).sort()).toEqual(['1', '2', '3'])
    expect(edges).toHaveLength(2)
  })

  it('uses name/label/title for node label, falls back to id', () => {
    const r: QueryResult = {
      ok: true,
      query: '',
      record_count: 1,
      result: {
        columns: ['n'],
        records: [
          {
            values: {},
            nodes: { n: { id: 'abc' }, m: { id: 'xyz', label: 'X' } },
          },
        ],
      },
    }
    const { nodes } = extractGraph(r)
    expect(nodes.find((n) => n.id === 'abc')?.label).toBe('abc')
    expect(nodes.find((n) => n.id === 'xyz')?.label).toBe('X')
  })

  it('skips nodes/edges without an id or endpoints', () => {
    const r: QueryResult = {
      ok: true,
      query: '',
      record_count: 1,
      result: {
        columns: ['n'],
        records: [
          {
            values: {},
            nodes: { n: { name: 'no-id' } },
            edges: { r: { source: '1' } },
          },
        ],
      },
    }
    const { nodes, edges } = extractGraph(r)
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })
})

describe('renderGraphHtml (golden snapshot)', () => {
  it('matches the captured snapshot for the fixture', () => {
    expect(renderGraphHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<section class="graph"><header class="summary">3 nodes · 2 edges</header><ul class="nodes"><li class="node" data-id="1">Ada</li><li class="node" data-id="2">Grace</li><li class="node" data-id="3">Linus</li></ul><ul class="edges"><li class="edge">1 → [KNOWS] 2</li><li class="edge">1 → [KNOWS] 3</li></ul></section>"`,
    )
  })
})
