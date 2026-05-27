import type { QueryResult } from '@red-ui/protocol'

export interface DiffEntry {
  index: number
  id: string
  change: string
  collection: string | null
  entityId: string | null
  before: unknown
  after: unknown
  note: string | null
  values: Record<string, unknown>
}

const CHANGE_COLUMNS = ['change', 'change_type', 'operation', 'op']
const COLLECTION_COLUMNS = ['target_collection', 'collection_name', 'diff_collection']
const ENTITY_COLUMNS = ['entity_id', 'row_id', 'rid', 'id']
const BEFORE_COLUMNS = ['before_state', 'before_row', 'before']
const AFTER_COLUMNS = ['after_state', 'after_row', 'after']
const NOTE_COLUMNS = ['note', 'summary', 'message']

function pick(values: Record<string, unknown>, names: string[]): [string, unknown] | null {
  for (const name of names) {
    if (name in values) return [name, values[name]]
  }
  return Object.entries(values).find(([k]) => names.includes(k.toLowerCase())) ?? null
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || !/^[{[]/.test(trimmed)) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function extractDiffEntries(result: QueryResult): DiffEntry[] {
  return result.result.records.map((record, index) => {
    const values = record.values ?? {}
    const change = pick(values, CHANGE_COLUMNS)
    const collection = pick(values, COLLECTION_COLUMNS)
    const entity = pick(values, ENTITY_COLUMNS)
    const before = pick(values, BEFORE_COLUMNS)
    const after = pick(values, AFTER_COLUMNS)
    const note = pick(values, NOTE_COLUMNS)
    return {
      index,
      id: String(values.id ?? values.diff_id ?? entity?.[1] ?? index + 1),
      change: String(change?.[1] ?? 'modified'),
      collection: collection?.[1] === undefined || collection?.[1] === null ? null : String(collection[1]),
      entityId: entity?.[1] === undefined || entity?.[1] === null ? null : String(entity[1]),
      before: parseMaybeJson(before?.[1] ?? null),
      after: parseMaybeJson(after?.[1] ?? null),
      note: note?.[1] === undefined || note?.[1] === null ? null : String(note[1]),
      values,
    }
  })
}

export function hasDiffShape(result: QueryResult): boolean {
  if (result.capability === 'diff') return true
  return result.result.records.some((record) => {
    const keys = Object.keys(record.values ?? {}).map((k) => k.toLowerCase())
    return CHANGE_COLUMNS.some((c) => keys.includes(c)) &&
      (BEFORE_COLUMNS.some((c) => keys.includes(c)) || AFTER_COLUMNS.some((c) => keys.includes(c)))
  })
}

export function summarizeDiff(entries: DiffEntry[]) {
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry.change, (counts.get(entry.change) ?? 0) + 1)
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}
