// Universal graph loader.
//
// Loads an arbitrary, contract-conformant `graph.json` (the versioned seam
// emitted by `memory:export` at `graph.json#contract`, schema:
// https://reddb.io/schemas/memory/graph-contract/v1.json) from a path or URL
// and adapts it into the `QueryResult` shape the existing `GraphRenderer`
// already consumes — so community coloring, force layout, search, and the
// neighborhood / shortest-path / centrality controls are reused, not forked.
//
// Consumers should read `graph.json#contract` and nothing else. This loader
// therefore accepts either a bare contract object (`{ version, nodes, edges,
// stats }`) or a full export bundle that wraps it under a `contract` key.

import type { QueryResult } from '#reddb'

/** The contract version this loader understands. Bumped on breaking changes. */
export const GRAPH_CONTRACT_VERSION = '1.0.0'

export type EdgeKind = 'imports' | 'defines' | 'references'

export interface ContractNode {
  id: number
  type: string
  label: string
  description: string | null
  exports: string[]
  layer: string | null
  community: string | null
  orphan: boolean
  metadata: Record<string, unknown>
}

export interface ContractEdge {
  source: number
  target: number
  kind: EdgeKind
  label: string
  direction: 'directed'
}

export interface ContractStats {
  node_count: number
  edge_count: number
  orphan_count: number
  community_count: number
  edge_kinds: Record<EdgeKind, number>
  node_types: Record<string, number>
}

export interface GraphContract {
  version: string
  nodes: ContractNode[]
  edges: ContractEdge[]
  stats: ContractStats
}

/** Raised when a value is not a conformant graph contract. Message is
 *  user-facing — it explains *why* the graph was rejected. */
export class GraphContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GraphContractError'
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Validate and narrow an arbitrary value into a {@link GraphContract}.
 *
 * Accepts a bare contract or an export bundle wrapping it under `contract`.
 * Throws {@link GraphContractError} with a clear, specific message on any
 * malformed or wrong-version input — never returns a partially-valid graph.
 */
export function parseGraphContract(raw: unknown): GraphContract {
  if (!isObject(raw)) {
    throw new GraphContractError(
      `Expected a JSON object, got ${raw === null ? 'null' : Array.isArray(raw) ? 'an array' : typeof raw}.`,
    )
  }

  // Unwrap a full export bundle: consumers integrate against `#contract`.
  const candidate = isObject(raw.contract) ? raw.contract : raw

  if (candidate.version === undefined) {
    throw new GraphContractError(
      'Not a graph contract: missing "version". Expected a graph.json with a "contract" key or a bare contract object.',
    )
  }
  if (candidate.version !== GRAPH_CONTRACT_VERSION) {
    throw new GraphContractError(
      `Unsupported graph contract version "${String(candidate.version)}". This viewer supports ${GRAPH_CONTRACT_VERSION}.`,
    )
  }

  if (!Array.isArray(candidate.nodes)) {
    throw new GraphContractError('Invalid graph contract: "nodes" must be an array.')
  }
  if (!Array.isArray(candidate.edges)) {
    throw new GraphContractError('Invalid graph contract: "edges" must be an array.')
  }

  const nodes = candidate.nodes.map((node, i) => parseNode(node, i))
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = candidate.edges.map((edge, i) => parseEdge(edge, i, nodeIds))

  const stats = isObject(candidate.stats)
    ? (candidate.stats as unknown as ContractStats)
    : deriveStats(nodes, edges)

  return { version: GRAPH_CONTRACT_VERSION, nodes, edges, stats }
}

function parseNode(node: unknown, i: number): ContractNode {
  if (!isObject(node)) {
    throw new GraphContractError(`Invalid node at index ${i}: expected an object.`)
  }
  if (typeof node.id !== 'number' || !Number.isFinite(node.id)) {
    throw new GraphContractError(`Invalid node at index ${i}: "id" must be a number.`)
  }
  if (typeof node.label !== 'string') {
    throw new GraphContractError(`Invalid node at index ${i} (id ${node.id}): "label" must be a string.`)
  }
  return {
    id: node.id,
    type: typeof node.type === 'string' ? node.type : 'node',
    label: node.label,
    description: typeof node.description === 'string' ? node.description : null,
    exports: Array.isArray(node.exports) ? node.exports.filter((e): e is string => typeof e === 'string') : [],
    layer: typeof node.layer === 'string' ? node.layer : null,
    community: typeof node.community === 'string' ? node.community : null,
    orphan: node.orphan === true,
    metadata: isObject(node.metadata) ? node.metadata : {},
  }
}

function parseEdge(edge: unknown, i: number, nodeIds: Set<number>): ContractEdge {
  if (!isObject(edge)) {
    throw new GraphContractError(`Invalid edge at index ${i}: expected an object.`)
  }
  if (typeof edge.source !== 'number' || typeof edge.target !== 'number') {
    throw new GraphContractError(`Invalid edge at index ${i}: "source" and "target" must be numbers.`)
  }
  if (nodeIds.size > 0 && (!nodeIds.has(edge.source) || !nodeIds.has(edge.target))) {
    throw new GraphContractError(
      `Invalid edge at index ${i}: references unknown node id ${
        nodeIds.has(edge.source) ? edge.target : edge.source
      }.`,
    )
  }
  const kind: EdgeKind =
    edge.kind === 'imports' || edge.kind === 'defines' || edge.kind === 'references'
      ? edge.kind
      : 'references'
  return {
    source: edge.source,
    target: edge.target,
    kind,
    label: typeof edge.label === 'string' ? edge.label : kind,
    direction: 'directed',
  }
}

function deriveStats(nodes: ContractNode[], edges: ContractEdge[]): ContractStats {
  const edgeKinds: Record<EdgeKind, number> = { imports: 0, defines: 0, references: 0 }
  for (const e of edges) edgeKinds[e.kind] += 1
  const nodeTypes: Record<string, number> = {}
  for (const n of nodes) nodeTypes[n.type] = (nodeTypes[n.type] ?? 0) + 1
  return {
    node_count: nodes.length,
    edge_count: edges.length,
    orphan_count: nodes.filter((n) => n.orphan).length,
    community_count: new Set(nodes.map((n) => n.community).filter((c): c is string => c != null)).size,
    edge_kinds: edgeKinds,
    node_types: nodeTypes,
  }
}

/**
 * Adapt a contract into the `QueryResult` the existing `GraphRenderer`
 * consumes (via `extractGraph`). We surface each node under the row `nodes`
 * map and each edge under the row `edges` map — the same "Shape A" a live
 * `MATCH … RETURN n, r, m` query produces — so no renderer changes are needed.
 *
 * The contract `type` is mapped onto `node_type`, the field the renderer reads
 * for its type filter and per-type coloring. `community` is preserved on the
 * node data; spatial community coloring is still recomputed by the renderer's
 * Louvain layout, so it works even when the contract carries no communities.
 */
export function contractToQueryResult(contract: GraphContract): QueryResult {
  const nodes: Record<string, unknown> = {}
  for (const n of contract.nodes) {
    nodes[String(n.id)] = {
      id: n.id,
      label: n.label,
      node_type: n.type,
      type: n.type,
      description: n.description,
      exports: n.exports,
      layer: n.layer,
      community: n.community,
      orphan: n.orphan,
      ...n.metadata,
    }
  }

  const edges: Record<string, unknown> = {}
  contract.edges.forEach((e, i) => {
    edges[`e${i}`] = {
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.kind,
      kind: e.kind,
      direction: e.direction,
    }
  })

  return {
    ok: true,
    query: 'graph.json',
    capability: 'graph',
    record_count: 1,
    result: {
      columns: ['n', 'r', 'm'],
      records: [{ values: {}, nodes, edges }],
    },
  }
}

/**
 * Load a contract-conformant `graph.json` from a path or URL and return the
 * validated contract. The `source` is fetched relative to the app origin when
 * it is a path; absolute URLs are fetched as-is.
 *
 * Throws {@link GraphContractError} on a non-OK response, invalid JSON, or a
 * malformed / wrong-version contract — every failure path yields a clear,
 * user-facing message.
 */
export async function loadGraphContract(
  source: string,
  fetchFn: typeof fetch = fetch,
): Promise<GraphContract> {
  const trimmed = source.trim()
  if (!trimmed) throw new GraphContractError('No path or URL provided.')

  let res: Response
  try {
    res = await fetchFn(trimmed)
  } catch (e) {
    throw new GraphContractError(`Could not fetch "${trimmed}": ${(e as Error).message}`)
  }
  if (!res.ok) {
    throw new GraphContractError(`Could not load "${trimmed}": ${res.status} ${res.statusText}`)
  }

  let raw: unknown
  try {
    raw = await res.json()
  } catch (e) {
    throw new GraphContractError(`"${trimmed}" is not valid JSON: ${(e as Error).message}`)
  }

  return parseGraphContract(raw)
}
