import type { QueryRow } from '#reddb'

export interface CollectionCatalogMetadata {
  name: string
  model?: string
  schemaMode?: string
  entities?: number
  segments?: number
  indices?: number
  inMemoryBytes?: number
  onDiskBytes?: number
  internal?: boolean
  tenantId?: string
  queueMode?: string
  dimension?: number
  metric?: string
  sessionKey?: string
  sessionGapMs?: number
}

export function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

export function collectionCatalogQuery(collection: string): string {
  return [
    'SELECT name, model, schema_mode, entities, segments, indices,',
    'in_memory_bytes, on_disk_bytes, internal, tenant_id, queue_mode,',
    'dimension, metric, session_key, session_gap_ms',
    'FROM red.collections',
    `WHERE name = ${sqlString(collection)}`,
    'LIMIT 1',
  ].join(' ')
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    if (v.toLowerCase() === 'true') return true
    if (v.toLowerCase() === 'false') return false
  }
  return undefined
}

export function collectionCatalogFromRow(row: QueryRow | undefined): CollectionCatalogMetadata | null {
  if (!row) return null
  const v = row.values
  const name = asString(v.name)
  if (!name) return null
  return {
    name,
    model: asString(v.model),
    schemaMode: asString(v.schema_mode),
    entities: asNumber(v.entities),
    segments: asNumber(v.segments),
    indices: asNumber(v.indices),
    inMemoryBytes: asNumber(v.in_memory_bytes),
    onDiskBytes: asNumber(v.on_disk_bytes),
    internal: asBoolean(v.internal),
    tenantId: asString(v.tenant_id),
    queueMode: asString(v.queue_mode),
    dimension: asNumber(v.dimension),
    metric: asString(v.metric),
    sessionKey: asString(v.session_key),
    sessionGapMs: asNumber(v.session_gap_ms),
  }
}

export function formatCount(value: number | undefined): string {
  if (value === undefined) return 'n/a'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatBytes(value: number | undefined): string {
  if (value === undefined) return 'n/a'
  if (value === 0) return '0 B'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const amount = value / 1024 ** exponent
  const digits = amount >= 100 || exponent === 0 ? 0 : 1
  return `${amount.toFixed(digits)} ${units[exponent]}`
}

export function formatDurationMs(value: number | undefined): string | null {
  if (value === undefined) return null
  if (value < 1000) return `${value} ms`
  if (value < 60_000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} s`
  if (value < 3_600_000) return `${(value / 60_000).toFixed(value >= 600_000 ? 0 : 1)} min`
  return `${(value / 3_600_000).toFixed(value >= 36_000_000 ? 0 : 1)} h`
}

export function collectionCatalogBadges(meta: CollectionCatalogMetadata): string[] {
  const badges: string[] = []
  if (meta.schemaMode) badges.push(meta.schemaMode)
  if (meta.dimension !== undefined) badges.push(`${formatCount(meta.dimension)}d`)
  if (meta.metric) badges.push(meta.metric)
  if (meta.queueMode) badges.push(meta.queueMode)
  if (meta.sessionKey) badges.push(`session: ${meta.sessionKey}`)
  const gap = formatDurationMs(meta.sessionGapMs)
  if (gap) badges.push(`gap ${gap}`)
  if (meta.internal) badges.push('internal')
  return badges
}
