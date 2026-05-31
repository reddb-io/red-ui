// Per-collection capability detection.
//
// Prefer metadata from `GET /collections/<name>` when reddb exposes it.
// Fallback: run `SELECT * FROM <name> LIMIT 1` and inspect either the
// QueryResult.capability field or `red_capabilities` on the first row.
// Default to `table` when the collection is empty or detection fails — this
// is the honest baseline, since every collection is at least table-shaped.

import type { CollectionMetadata, RedClient } from '#reddb'
import type { QueryResult } from '#reddb'

export type Capability =
  | 'table'
  | 'graph'
  | 'hypertable'
  | 'kv'
  | 'vector'
  | 'queue'
  | 'stats'
  | 'diff'
  | 'document'

// Priority order: more specific capabilities win over generic ones. A row
// tagged ["document","structured","table"] should surface as `document`, not
// `table`, because `table` is the universal fallback.
const PRIORITY: Capability[] = [
  'vector',
  'queue',
  'stats',
  'diff',
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
  queue: 'queue',
  stream: 'queue',
  message: 'queue',
  stats: 'stats',
  statistic: 'stats',
  statistics: 'stats',
  metric: 'stats',
  metrics: 'stats',
  document: 'document',
  doc: 'document',
  time_series: 'hypertable',
  key_value: 'kv',
  mixed: 'table',
  hll: 'stats',
  sketch: 'stats',
  filter: 'stats',
  cuckoo_filter: 'stats',
  diff: 'diff',
  vcs_diff: 'diff',
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
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

export function tagsFromCollectionMetadata(meta: CollectionMetadata): string[] {
  const tags: string[] = []
  if (meta.kind) tags.push(meta.kind)
  if (meta.capability) tags.push(meta.capability)
  if (Array.isArray(meta.capabilities)) {
    for (const tag of meta.capabilities) if (typeof tag === 'string') tags.push(tag)
  }
  const schemaKind = meta.schema?.['kind']
  if (typeof schemaKind === 'string') tags.push(schemaKind)
  const schemaCapability = meta.schema?.['capability']
  if (typeof schemaCapability === 'string') tags.push(schemaCapability)
  return tags
}

export function capabilityFromCatalogModel(model: unknown): Capability | null {
  if (typeof model !== 'string') return null
  return ALIASES[model.toLowerCase()] ?? null
}

async function detectProbabilisticCapability(client: RedClient, collection: string): Promise<Capability | null> {
  const safe = collection.replace(/[^A-Za-z0-9_./-]/g, '')
  for (const query of [`HLL INFO ${safe}`, `SKETCH INFO ${safe}`, `FILTER INFO ${safe}`]) {
    try {
      const r = await client.query(query)
      if (r.ok) return 'stats'
    } catch {
      // Try the next probabilistic read form. RedDB may report FILTER as
      // model=mixed in red.collections, so SELECT probing is not enough.
    }
  }
  return null
}

function columnsFromResult(r: QueryResult): string[] {
  const cols = new Set((r.result?.columns ?? []).map((c) => c.toLowerCase()))
  const first = r.result?.records?.[0]?.values
  if (first) {
    for (const key of Object.keys(first)) cols.add(key.toLowerCase())
  }
  return [...cols]
}

function inferCapabilityFromShape(r: QueryResult): Capability | null {
  const cols = columnsFromResult(r)
  const has = (name: string) => cols.includes(name)
  const hasAny = (names: string[]) => names.some(has)
  const first = r.result?.records?.[0]?.values
  const kind = first?.kind ?? first?.red_kind ?? first?.red_entity_type

  if (kind === 'node' || kind === 'edge' || kind === 'graph') return 'graph'
  if (kind === 'document') return 'document'
  if (kind === 'kv' || (has('key') && has('value'))) return 'kv'
  if (hasAny(['message', 'payload', 'body']) && hasAny(['message_id', 'state', 'status', 'consumer', 'delivery_state'])) return 'queue'
  if (hasAny(['timestamp', 'time', 'ts', 'event_time', 'bucket']) && hasAny(['value', 'count', 'metric'])) return 'hypertable'
  if (hasAny(['metric', 'stat', 'name', 'table']) && hasAny(['value', 'count', 'total', 'avg', 'rate', 'row_count', 'page_count', 'cardinality', 'memory_bytes'])) return 'stats'
  return null
}

export async function detectCapability(
  client: RedClient,
  collection: string,
  opts: { useMetadata?: boolean } = {},
): Promise<Capability> {
  if (opts.useMetadata) {
    try {
      const meta = await client.collection(collection)
      const tags = tagsFromCollectionMetadata(meta)
      if (tags.length > 0) return pickCapability(tags)
    } catch {
      // Metadata is optional for older reddb builds; fall through to row probing.
    }
  }

  try {
    const r = await client.query(`SELECT model FROM red.collections WHERE name = ${sqlString(collection)} LIMIT 1`)
    const model = r.result?.records?.[0]?.values?.model
    const cap = capabilityFromCatalogModel(model)
    if (cap && cap !== 'table') return cap
    if (typeof model === 'string' && model.toLowerCase() === 'mixed') {
      const probabilistic = await detectProbabilisticCapability(client, collection)
      if (probabilistic) return probabilistic
    }
  } catch {
    // Older servers may not expose red.collections; row probing still works.
  }

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
    const tagged = pickCapability(tags)
    if (tagged !== 'table') return tagged
    return inferCapabilityFromShape(r) ?? 'table'
  } catch {
    return await detectProbabilisticCapability(client, collection) ?? 'table'
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
  queue:      { glyph: '≡', label: 'Queue' },
  stats:      { glyph: '◔', label: 'Stats' },
  diff:       { glyph: '⇄', label: 'Diff' },
  document:   { glyph: '¶', label: 'Document' },
}

const INTERNAL_PREFIX = /^red[._]/i

export function isInternalCollection(name: string): boolean {
  return INTERNAL_PREFIX.test(name)
}
