import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@red-ui/protocol'
import { compareGraphNodesByCentrality, extractGraph, graphNodeCentrality, graphNodeIncomingSizeScales, hasGraphShape, renderGraphHtml, runGraphLayout, type GraphEdge, type GraphNode } from './graph-render'

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

describe('graphNodeCentrality', () => {
  it('counts in/out degree and sorts higher-score nodes first', () => {
    const { nodes, edges } = extractGraph(FIXTURE)
    const centrality = graphNodeCentrality(nodes, edges)

    expect(centrality.get('1')).toMatchObject({ degree: 2, outDegree: 2, inDegree: 0, score: 2 })
    expect(centrality.get('2')).toMatchObject({ degree: 1, outDegree: 0, inDegree: 1, score: 1 })

    const sorted = [...nodes].sort((a, b) => compareGraphNodesByCentrality(a, b, centrality))
    expect(sorted.map((n) => n.label)).toEqual(['Ada', 'Grace', 'Linus'])
  })

  it('uses explicit centrality scores when the server provides them', () => {
    const graph = {
      nodes: [
        { id: '1', label: 'Low degree, high centrality', data: { centrality_score: 99 } },
        { id: '2', label: 'High degree', data: {} },
        { id: '3', label: 'Leaf', data: {} },
      ],
      edges: [
        { id: 'a', source: '2', target: '3' },
      ],
    }
    const centrality = graphNodeCentrality(graph.nodes, graph.edges)
    const sorted = [...graph.nodes].sort((a, b) => compareGraphNodesByCentrality(a, b, centrality))

    expect(centrality.get('1')?.score).toBe(99)
    expect(sorted[0].id).toBe('1')
  })

  it('tiers node size from incoming edge count', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      label: `n${i}`,
      data: {},
    }))
    const edges = nodes.flatMap((target, incoming) =>
      Array.from({ length: incoming }, (_, i) => ({
        id: `${i}->${target.id}`,
        source: '0',
        target: target.id,
      })),
    )
    const centrality = graphNodeCentrality(nodes, edges)
    const scales = graphNodeIncomingSizeScales(nodes, centrality)

    expect(scales.get('1')).toBe(1)
    expect(scales.get('5')).toBe(1.25)
    expect(scales.get('8')).toBe(1.5)
    expect(scales.get('9')).toBe(2)
  })
})

describe('runGraphLayout', () => {
  const makeNode = (id: string): GraphNode => ({ id, label: id, data: {} })
  const makeEdge = (source: string, target: string): GraphEdge => ({
    id: `${source}->${target}`,
    source,
    target,
  })

  it('returns empty map for empty input', () => {
    expect(runGraphLayout([], []).size).toBe(0)
  })

  it('places a single node at the centre', () => {
    const out = runGraphLayout([makeNode('a')], [])
    expect(out.get('a')).toEqual({ x: 50, y: 50, community: 0 })
  })

  it('outputs positions inside the [0, 100] viewport', () => {
    const nodes = Array.from({ length: 30 }, (_, i) => makeNode(`n${i}`))
    const edges: GraphEdge[] = []
    for (let i = 0; i < nodes.length - 1; i++) edges.push(makeEdge(`n${i}`, `n${i + 1}`))
    const out = runGraphLayout(nodes, edges)
    for (const pos of out.values()) {
      expect(pos.x).toBeGreaterThanOrEqual(0)
      expect(pos.x).toBeLessThanOrEqual(100)
      expect(pos.y).toBeGreaterThanOrEqual(0)
      expect(pos.y).toBeLessThanOrEqual(100)
    }
  })

  it('clusters communities spatially on a two-clique graph', () => {
    // Two K4 cliques joined by one bridge edge. Louvain should detect the
    // two communities and ForceAtlas2 should pull each clique together
    // while pushing them apart — intra-clique distance < cross-clique.
    const left = ['l1', 'l2', 'l3', 'l4']
    const right = ['r1', 'r2', 'r3', 'r4']
    const nodes = [...left, ...right].map(makeNode)
    const edges: GraphEdge[] = []
    for (const a of left) for (const b of left) if (a < b) edges.push(makeEdge(a, b))
    for (const a of right) for (const b of right) if (a < b) edges.push(makeEdge(a, b))
    edges.push(makeEdge('l1', 'r1'))

    const out = runGraphLayout(nodes, edges)
    const leftCommunities = new Set(left.map((id) => out.get(id)!.community))
    const rightCommunities = new Set(right.map((id) => out.get(id)!.community))
    expect(leftCommunities.size).toBe(1)
    expect(rightCommunities.size).toBe(1)
    expect([...leftCommunities][0]).not.toBe([...rightCommunities][0])

    const dist = (a: string, b: string) => {
      const pa = out.get(a)!
      const pb = out.get(b)!
      return Math.hypot(pa.x - pb.x, pa.y - pb.y)
    }
    let intra = 0
    let intraN = 0
    for (const group of [left, right]) {
      for (const a of group) for (const b of group) if (a < b) {
        intra += dist(a, b)
        intraN++
      }
    }
    let cross = 0
    let crossN = 0
    for (const a of left) for (const b of right) {
      cross += dist(a, b)
      crossN++
    }
    expect(intra / intraN).toBeLessThan(cross / crossN)
  })

  it('is deterministic across runs (seeded RNG)', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => makeNode(`n${i}`))
    const edges: GraphEdge[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if ((i + j) % 3 === 0) edges.push(makeEdge(`n${i}`, `n${j}`))
      }
    }
    const a = runGraphLayout(nodes, edges)
    const b = runGraphLayout(nodes, edges)
    for (const id of a.keys()) expect(a.get(id)).toEqual(b.get(id))
  })
})

describe('renderGraphHtml (golden snapshot)', () => {
  it('matches the captured snapshot for the fixture', () => {
    expect(renderGraphHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<section class="graph"><header class="summary">3 nodes · 2 edges</header><ul class="nodes"><li class="node" data-id="1">Ada</li><li class="node" data-id="2">Grace</li><li class="node" data-id="3">Linus</li></ul><ul class="edges"><li class="edge">1 → [KNOWS] 2</li><li class="edge">1 → [KNOWS] 3</li></ul></section>"`,
    )
  })
})
