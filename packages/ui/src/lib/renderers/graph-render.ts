// Pure rendering helpers for the graph capability. Shared between the
// Svelte GraphRenderer (xyflow canvas) and the golden-snapshot test
// (which checks the adjacency-list / DOM-free shape).

import type { QueryResult, QueryRow } from '@red-ui/protocol'

export interface GraphNode {
  id: string
  label: string
  data: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function pickNodeId(node: Record<string, unknown>): string | null {
  const id = node.id ?? node.rid ?? node._id ?? node.uid
  if (id === null || id === undefined) return null
  return String(id)
}

function pickNodeLabel(node: Record<string, unknown>, id: string): string {
  const lbl = node.label ?? node.name ?? node.title
  if (lbl !== undefined && lbl !== null) return String(lbl)
  return id
}

function pickEdgeEndpoints(
  edge: Record<string, unknown>,
): { source: string; target: string } | null {
  const s = edge.source ?? edge.from ?? edge.src ?? edge.start
  const t = edge.target ?? edge.to ?? edge.dst ?? edge.end
  if (s === null || s === undefined || t === null || t === undefined) return null
  return { source: String(s), target: String(t) }
}

/**
 * Pull nodes and edges out of a graph-shaped result.
 *
 * A graph query (`MATCH (n)-[r]->(m) RETURN n, r, m`) returns rows where
 * each alias maps to a node or edge object. reddb surfaces these on the
 * QueryRow as optional `nodes` and `edges` maps (keyed by alias). We
 * dedupe nodes by id across rows and edges by (source, target, label).
 */
export function extractGraph(result: QueryResult): GraphData {
  const nodes = new Map<string, GraphNode>()
  const edges = new Map<string, GraphEdge>()

  for (const rec of result.result.records as QueryRow[]) {
    if (rec.nodes) {
      for (const value of Object.values(rec.nodes)) {
        if (!value || typeof value !== 'object') continue
        const node = value as Record<string, unknown>
        const id = pickNodeId(node)
        if (!id) continue
        if (!nodes.has(id)) {
          nodes.set(id, { id, label: pickNodeLabel(node, id), data: node })
        }
      }
    }
    if (rec.edges) {
      for (const value of Object.values(rec.edges)) {
        if (!value || typeof value !== 'object') continue
        const edge = value as Record<string, unknown>
        const ends = pickEdgeEndpoints(edge)
        if (!ends) continue
        const label = edge.label ?? edge.type ?? edge.rel
        const key = `${ends.source}->${ends.target}:${asString(label)}`
        if (!edges.has(key)) {
          edges.set(key, {
            id: key,
            source: ends.source,
            target: ends.target,
            label: label !== undefined ? String(label) : undefined,
          })
        }
      }
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] }
}

export function hasGraphShape(result: QueryResult): boolean {
  const records = result.result?.records as QueryRow[] | undefined
  if (!records || records.length === 0) return false
  return records.some(
    (r) =>
      (r.nodes && Object.keys(r.nodes).length > 0) ||
      (r.edges && Object.keys(r.edges).length > 0),
  )
}

/**
 * DOM-free adjacency-list HTML for snapshot tests and for the "view as
 * adjacency list to export" affordance.
 */
export function renderGraphHtml(result: QueryResult): string {
  const { nodes, edges } = extractGraph(result)
  const lines: string[] = []
  lines.push('<section class="graph">')
  lines.push(`<header class="summary">${nodes.length} nodes · ${edges.length} edges</header>`)
  lines.push('<ul class="nodes">')
  for (const n of nodes) {
    lines.push(`<li class="node" data-id="${escapeHtml(n.id)}">${escapeHtml(n.label)}</li>`)
  }
  lines.push('</ul>')
  lines.push('<ul class="edges">')
  for (const e of edges) {
    const lbl = e.label ? ` [${escapeHtml(e.label)}]` : ''
    lines.push(
      `<li class="edge">${escapeHtml(e.source)} →${lbl} ${escapeHtml(e.target)}</li>`,
    )
  }
  lines.push('</ul>')
  lines.push('</section>')
  return lines.join('')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
