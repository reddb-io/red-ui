import { describe, it, expect } from 'vitest'
import {
  parseGraphExport,
  parseGraphExportJson,
  loadGraphExport,
  GraphContractError,
  SUPPORTED_GRAPH_VERSION_MAJOR,
} from './contract'
import { extractGraph, hasGraphShape } from '$lib/renderers/graph-render'

/** A minimal, contract-conformant export (nested envelope). */
function validExport() {
  return {
    version: '1.0',
    graph: {
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          type: 'concept',
          community: 0,
          centrality: 0.75,
          properties: { note: 'root' },
        },
        { id: 'b', label: 'Beta', community: 1 },
        { id: 'c', label: 'Gamma', community: 1 },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'rel' },
        { source: 'b', target: 'c' },
      ],
    },
    communities: [
      { id: 0, label: 'Roots', color: '#ff2056', size: 1 },
      { id: 1, label: 'Leaves', size: 2 },
    ],
    meta: { source: 'unit-test' },
  }
}

describe('parseGraphExport — model', () => {
  it('yields the expected node/edge/community model', () => {
    const loaded = parseGraphExport(validExport())

    expect(loaded.version).toBe('1.0')
    expect(loaded.model.nodes).toHaveLength(3)
    expect(loaded.model.edges).toHaveLength(2)

    expect(loaded.model.nodes[0]).toMatchObject({
      id: 'a',
      label: 'Alpha',
      type: 'concept',
      community: 0,
    })
    expect(loaded.model.nodes[0].data).toMatchObject({ centrality: 0.75 })

    expect(loaded.model.edges[0]).toMatchObject({
      source: 'a',
      target: 'b',
      type: 'rel',
    })

    expect(loaded.model.communities).toEqual([
      { id: 0, label: 'Roots', color: '#ff2056', size: 1 },
      { id: 1, label: 'Leaves', color: expect.any(String), size: 2 },
    ])

    expect(loaded.meta).toEqual({ source: 'unit-test' })
  })

  it('accepts the flat envelope (nodes/edges at top level)', () => {
    const loaded = parseGraphExport({
      version: '1.0',
      nodes: [{ id: 'x' }, { id: 'y' }],
      edges: [{ source: 'x', target: 'y' }],
    })
    expect(loaded.model.nodes.map((n) => n.id)).toEqual(['x', 'y'])
    expect(loaded.model.edges).toHaveLength(1)
  })

  it('coerces numeric ids to strings and defaults label to the id', () => {
    const loaded = parseGraphExport({
      version: '1.2',
      graph: { nodes: [{ id: 42 }], edges: [{ source: 42, target: 42 }] },
    })
    expect(loaded.model.nodes[0].id).toBe('42')
    expect(loaded.model.nodes[0].label).toBe('42')
    expect(loaded.model.edges[0]).toMatchObject({ source: '42', target: '42' })
  })

  it('defaults communities to an empty array when omitted', () => {
    const loaded = parseGraphExport({
      version: '1.0',
      graph: { nodes: [{ id: 'x' }], edges: [] },
    })
    expect(loaded.model.communities).toEqual([])
    expect(SUPPORTED_GRAPH_VERSION_MAJOR).toBe(1)
  })
})

describe('parseGraphExport — renderer reuse', () => {
  it('produces a graph-shaped QueryResult the existing renderer accepts', () => {
    const loaded = parseGraphExport(validExport())

    // The exact contract the GraphRenderer relies on.
    expect(hasGraphShape(loaded.result)).toBe(true)

    // extractGraph is what GraphRenderer calls internally — proving reuse.
    const graph = extractGraph(loaded.result)
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
    expect(graph.nodes.find((n) => n.id === 'a')?.label).toBe('Alpha')
    expect(graph.edges).toHaveLength(2)
    expect(graph.edges[0]).toMatchObject({ source: 'a', target: 'b', label: 'rel' })
  })
})

describe('parseGraphExport — malformed / wrong version', () => {
  it('rejects a non-object payload', () => {
    expect(() => parseGraphExport(null)).toThrow(GraphContractError)
    expect(() => parseGraphExport('nope')).toThrow(/must be a JSON object/)
  })

  it('rejects a missing version', () => {
    expect(() => parseGraphExport({ graph: { nodes: [], edges: [] } })).toThrow(
      /missing a "version"/,
    )
  })

  it('rejects an unsupported major version with a clear message', () => {
    expect(() =>
      parseGraphExport({ version: '2.0', graph: { nodes: [], edges: [] } }),
    ).toThrow(/Unsupported graph export version "2.0"[\s\S]*supports version 1\.x/)
  })

  it('rejects non-array nodes/edges', () => {
    expect(() =>
      parseGraphExport({ version: '1.0', graph: { nodes: {}, edges: [] } }),
    ).toThrow(/"nodes" must be an array/)
    expect(() =>
      parseGraphExport({ version: '1.0', graph: { nodes: [], edges: 7 } }),
    ).toThrow(/"edges" must be an array/)
  })

  it('rejects a node missing an id, naming the offending index', () => {
    expect(() =>
      parseGraphExport({
        version: '1.0',
        graph: { nodes: [{ id: 'a' }, { label: 'no id' }], edges: [] },
      }),
    ).toThrow(/node at index 1 is missing the required "id"/)
  })

  it('rejects an edge missing source/target, naming the offending index', () => {
    expect(() =>
      parseGraphExport({
        version: '1.0',
        graph: { nodes: [{ id: 'a' }], edges: [{ source: 'a' }] },
      }),
    ).toThrow(/edge at index 0 is missing the required "target"/)
  })
})

describe('parseGraphExportJson', () => {
  it('parses a valid JSON string', () => {
    const loaded = parseGraphExportJson(JSON.stringify(validExport()))
    expect(loaded.model.nodes).toHaveLength(3)
  })

  it('wraps JSON syntax errors as GraphContractError', () => {
    expect(() => parseGraphExportJson('{ not json ')).toThrow(GraphContractError)
    expect(() => parseGraphExportJson('{ not json ')).toThrow(/not valid JSON/)
  })
})

describe('loadGraphExport', () => {
  it('fetches and parses a graph from a URL', async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify(validExport()), { status: 200 })) as typeof fetch
    const loaded = await loadGraphExport('https://example.test/graph.json', { fetch: fetchFn })
    expect(loaded.model.nodes).toHaveLength(3)
    expect(hasGraphShape(loaded.result)).toBe(true)
  })

  it('reports a clear error on a non-OK HTTP response', async () => {
    const fetchFn = (async () =>
      new Response('not found', { status: 404, statusText: 'Not Found' })) as typeof fetch
    await expect(
      loadGraphExport('https://example.test/missing.json', { fetch: fetchFn }),
    ).rejects.toThrow(/HTTP 404/)
  })

  it('reports a clear error when the fetch itself fails', async () => {
    const fetchFn = (async () => {
      throw new Error('network down')
    }) as typeof fetch
    await expect(
      loadGraphExport('https://example.test/graph.json', { fetch: fetchFn }),
    ).rejects.toThrow(/Failed to fetch graph[\s\S]*network down/)
  })

  it('surfaces contract errors from fetched-but-wrong-version payloads', async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify({ version: '9.9', graph: { nodes: [], edges: [] } }), {
        status: 200,
      })) as typeof fetch
    await expect(
      loadGraphExport('https://example.test/old.json', { fetch: fetchFn }),
    ).rejects.toThrow(/Unsupported graph export version/)
  })
})
