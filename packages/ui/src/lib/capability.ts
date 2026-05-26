// Per-collection capability detection.
//
// reddb doesn't expose `GET /collections/<name>/capability` yet (see #6 brief).
// Heuristic v1: run `SELECT * FROM <name> LIMIT 1` and inspect either the
// QueryResult.capability field or `red_capabilities` on the first row.
// Default to `table` when the collection is empty or detection fails — this
// is the honest baseline, since every collection is at least table-shaped.

import type { RedClient } from '@red-ui/protocol'

export type Capability =
  | 'table'
  | 'graph'
  | 'hypertable'
  | 'kv'
  | 'vector'
  | 'document'

// Priority order: more specific capabilities win over generic ones. A row
// tagged ["document","structured","table"] should surface as `document`, not
// `table`, because `table` is the universal fallback.
const PRIORITY: Capability[] = [
  'vector',
  'hypertable',
  'graph',
  'kv',
  'document',
  'table',
]

const ALIASES: Record<string, Capability> = {
  table: 'table',
  structured: 'table',
  graph: 'graph',
  node: 'graph',
  edge: 'graph',
  hypertable: 'hypertable',
  timeseries: 'hypertable',
  'time-series': 'hypertable',
  kv: 'kv',
  'key-value': 'kv',
  vector: 'vector',
  embedding: 'vector',
  document: 'document',
  doc: 'document',
}

export function pickCapability(tags: ReadonlyArray<string>): Capability {
  if (!tags || tags.length === 0) return 'table'
  const mapped = new Set<Capability>()
  for (const raw of tags) {
    const t = String(raw).toLowerCase()
    const cap = ALIASES[t]
    if (cap) mapped.add(cap)
  }
  for (const cap of PRIORITY) {
    if (mapped.has(cap)) return cap
  }
  return 'table'
}

export async function detectCapability(
  client: RedClient,
  collection: string,
): Promise<Capability> {
  try {
    const safe = collection.replace(/[^A-Za-z0-9_./-]/g, '')
    const r = await client.query(`SELECT * FROM ${safe} LIMIT 1`)
    const tags: string[] = []
    if (r.capability) tags.push(r.capability)
    const first = r.result?.records?.[0]?.values
    const rc = first ? (first['red_capabilities'] as unknown) : undefined
    if (Array.isArray(rc)) {
      for (const t of rc) if (typeof t === 'string') tags.push(t)
    } else if (typeof rc === 'string') {
      // reddb stamps comma-separated capabilities ("graph,graph_node");
      // split so each individual tag has a chance to match an alias.
      for (const t of rc.split(/[,\s]+/)) if (t) tags.push(t)
    }
    return pickCapability(tags)
  } catch {
    return 'table'
  }
}

export interface CapabilityGlyph {
  glyph: string
  label: string
}

// Unicode glyphs chosen to read clearly on both light and dark surfaces
// at 12–14px monospace. Geometric shapes only — no emoji (color-inconsistent).
export const CAPABILITY_GLYPHS: Record<Capability, CapabilityGlyph> = {
  table:      { glyph: '▦', label: 'Table' },
  graph:      { glyph: '◇', label: 'Graph' },
  hypertable: { glyph: '⊞', label: 'Hypertable' },
  kv:         { glyph: '⋮', label: 'Key-value' },
  vector:     { glyph: '→', label: 'Vector' },
  document:   { glyph: '¶', label: 'Document' },
}

const INTERNAL_PREFIX = /^red[._]/i

export function isInternalCollection(name: string): boolean {
  return INTERNAL_PREFIX.test(name)
}
