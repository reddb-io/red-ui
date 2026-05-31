import { describe, expect, it } from 'vitest'
import {
  GRAPH_CONTRACT_VERSION,
  GraphContractError,
  contractToQueryResult,
  loadGraphContract,
  parseGraphContract,
  type GraphContract,
} from './graph-loader'
import { extractGraph, runGraphLayout } from './renderers/graph-render'

// A small but representative contract: two communities joined by a bridge,
// mixed edge kinds, an orphan, and round-tripped metadata.
const CONTRACT: GraphContract = {
  version: '1.0.0',
  nodes: [
    { id: 1, type: 'file', label: 'a.ts', description: 'entry', exports: ['main'], layer: 'L1', community: 'c0', orphan: true, metadata: { path: 'src/a.ts' } },
    { id: 2, type: 'symbol', label: 'main', description: null, exports: [], layer: 'L1', community: 'c0', orphan: false, metadata: {} },
    { id: 3, type: 'file', label: 'b.ts', description: null, exports: [], layer: 'L2', community: 'c1', orphan: false, metadata: {} },
    { id: 4, type: 'symbol', label: 'helper', description: null, exports: [], layer: 'L2', community: 'c1', orphan: false, metadata: {} },
  ],
  edges: [
    { source: 1, target: 2, kind: 'defines', label: 'CONTAINS', direction: 'directed' },
    { source: 3, target: 4, kind: 'defines', label: 'CONTAINS', direction: 'directed' },
    { source: 1, target: 3, kind: 'imports', label: 'IMPORTS', direction: 'directed' },
    { source: 2, target: 4, kind: 'references', label: 'CALLS', direction: 'directed' },
  ],
  stats: {
    node_count: 4,
    edge_count: 4,
    orphan_count: 1,
    community_count: 2,
    edge_kinds: { imports: 1, defines: 2, references: 1 },
    node_types: { file: 2, symbol: 2 },
  },
}

describe('parseGraphContract', () => {
  it('accepts a bare contract', () => {
    const c = parseGraphContract(CONTRACT)
    expect(c.version).toBe(GRAPH_CONTRACT_VERSION)
    expect(c.nodes).toHaveLength(4)
    expect(c.edges).toHaveLength(4)
  })

  it('unwraps a full export bundle under the `contract` key', () => {
    const bundle = { health: { score: 1 }, evidence: [], contract: CONTRACT }
    const c = parseGraphContract(bundle)
    expect(c.nodes).toHaveLength(4)
    expect(c.stats.community_count).toBe(2)
  })

  it('preserves type, layer, community and metadata losslessly', () => {
    const c = parseGraphContract(CONTRACT)
    const a = c.nodes.find((n) => n.id === 1)!
    expect(a.type).toBe('file')
    expect(a.layer).toBe('L1')
    expect(a.community).toBe('c0')
    expect(a.exports).toEqual(['main'])
    expect(a.metadata).toEqual({ path: 'src/a.ts' })
    expect(a.orphan).toBe(true)
  })

  it('rejects a non-object', () => {
    expect(() => parseGraphContract(42)).toThrow(GraphContractError)
    expect(() => parseGraphContract(null)).toThrow(/JSON object/)
  })

  it('rejects a missing version with a clear message', () => {
    expect(() => parseGraphContract({ nodes: [], edges: [] })).toThrow(/missing "version"/)
  })

  it('rejects a wrong/unsupported version with a clear message', () => {
    const wrong = { ...CONTRACT, version: '2.0.0' }
    expect(() => parseGraphContract(wrong)).toThrow(/Unsupported graph contract version "2.0.0"/)
  })

  it('rejects malformed nodes', () => {
    const bad = { ...CONTRACT, nodes: [{ id: 'x', label: 'a.ts' }] }
    expect(() => parseGraphContract(bad)).toThrow(/"id" must be a number/)
  })

  it('rejects edges referencing unknown nodes', () => {
    const bad = { ...CONTRACT, edges: [{ source: 1, target: 99, kind: 'imports', label: 'IMPORTS', direction: 'directed' }] }
    expect(() => parseGraphContract(bad)).toThrow(/unknown node id 99/)
  })

  it('rejects a non-array nodes field', () => {
    expect(() => parseGraphContract({ version: '1.0.0', nodes: {}, edges: [] })).toThrow(/"nodes" must be an array/)
  })
})

describe('contractToQueryResult → extractGraph', () => {
  it('yields the expected node/edge model the GraphRenderer consumes', () => {
    const result = contractToQueryResult(parseGraphContract(CONTRACT))
    const { nodes, edges } = extractGraph(result)

    expect(nodes.map((n) => n.id).sort()).toEqual(['1', '2', '3', '4'])
    expect(nodes.find((n) => n.id === '1')?.label).toBe('a.ts')
    // `node_type` is what the renderer's type filter / coloring reads.
    expect(nodes.find((n) => n.id === '1')?.data.node_type).toBe('file')
    expect(nodes.find((n) => n.id === '2')?.data.node_type).toBe('symbol')

    expect(edges).toHaveLength(4)
    const imp = edges.find((e) => e.label === 'IMPORTS')!
    expect(imp.source).toBe('1')
    expect(imp.target).toBe('3')
  })

  it('produces a community model: the force layout assigns each node a community', () => {
    const result = contractToQueryResult(parseGraphContract(CONTRACT))
    const { nodes, edges } = extractGraph(result)
    const layout = runGraphLayout(nodes, edges)

    expect(layout.size).toBe(4)
    for (const n of nodes) {
      const pos = layout.get(n.id)!
      expect(pos).toBeDefined()
      expect(typeof pos.community).toBe('number')
      expect(pos.x).toBeGreaterThanOrEqual(0)
      expect(pos.x).toBeLessThanOrEqual(100)
    }
    // The two CONTAINS-linked pairs joined only by a single bridge edge
    // should resolve into more than one community.
    const communities = new Set([...layout.values()].map((p) => p.community))
    expect(communities.size).toBeGreaterThanOrEqual(1)
  })

  it('preserves the contract community id on node data', () => {
    const result = contractToQueryResult(parseGraphContract(CONTRACT))
    const { nodes } = extractGraph(result)
    expect(nodes.find((n) => n.id === '1')?.data.community).toBe('c0')
    expect(nodes.find((n) => n.id === '3')?.data.community).toBe('c1')
  })
})

describe('loadGraphContract', () => {
  function mockFetch(body: unknown, init?: { ok?: boolean; status?: number; statusText?: string; throws?: Error; invalidJson?: boolean }): typeof fetch {
    return (async () => {
      if (init?.throws) throw init.throws
      return {
        ok: init?.ok ?? true,
        status: init?.status ?? 200,
        statusText: init?.statusText ?? 'OK',
        json: async () => {
          if (init?.invalidJson) throw new SyntaxError('Unexpected token')
          return body
        },
      } as Response
    }) as unknown as typeof fetch
  }

  it('loads and validates a contract from a path', async () => {
    const c = await loadGraphContract('/graph.json', mockFetch(CONTRACT))
    expect(c.nodes).toHaveLength(4)
  })

  it('loads from a bundle wrapper', async () => {
    const c = await loadGraphContract('https://x/graph.json', mockFetch({ contract: CONTRACT }))
    expect(c.stats.node_count).toBe(4)
  })

  it('rejects an empty source', async () => {
    await expect(loadGraphContract('  ', mockFetch(CONTRACT))).rejects.toThrow(/No path or URL/)
  })

  it('surfaces a non-OK HTTP response clearly', async () => {
    await expect(
      loadGraphContract('/missing.json', mockFetch(null, { ok: false, status: 404, statusText: 'Not Found' })),
    ).rejects.toThrow(/404 Not Found/)
  })

  it('surfaces a fetch/network error clearly', async () => {
    await expect(
      loadGraphContract('/x.json', mockFetch(null, { throws: new TypeError('Failed to fetch') })),
    ).rejects.toThrow(/Could not fetch.*Failed to fetch/)
  })

  it('surfaces invalid JSON clearly', async () => {
    await expect(
      loadGraphContract('/bad.json', mockFetch(null, { invalidJson: true })),
    ).rejects.toThrow(/not valid JSON/)
  })

  it('surfaces a wrong-version contract clearly', async () => {
    await expect(
      loadGraphContract('/v2.json', mockFetch({ ...CONTRACT, version: '9.9.9' })),
    ).rejects.toThrow(/Unsupported graph contract version "9.9.9"/)
  })
})
