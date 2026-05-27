import type { QueryResult } from '@red-ui/protocol'

export interface VectorRow {
  index: number
  id: string
  vectorColumn: string | null
  vector: number[]
  dimension: number
  scalarColumn: string | null
  scalar: number | null
  metadata: Record<string, unknown>
}

const VECTOR_NAMES = /(^|_)(vector|embedding|embeddings|turbovec)($|_)/i
const SCALAR_NAMES = /(^|_)(scalar|score|distance|similarity|magnitude|norm)($|_)/i
const SYSTEM_NAMES = new Set([
  'rid',
  'entity_id',
  'red_entity_id',
  'red_entity_type',
  'red_kind',
  'red_collection',
  'red_sequence_id',
  'collection',
  'kind',
  'tenant',
  'created_at',
  'updated_at',
  'dimension',
])

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number' && Number.isFinite(x))
}

function pickVector(values: Record<string, unknown>): [string, number[]] | null {
  const named = Object.entries(values).find(([k, v]) => VECTOR_NAMES.test(k) && isNumberArray(v))
  if (named) return named as [string, number[]]
  const any = Object.entries(values).find(([, v]) => isNumberArray(v))
  return any ? (any as [string, number[]]) : null
}

function pickScalar(values: Record<string, unknown>, vectorColumn: string | null): [string, number] | null {
  const named = Object.entries(values).find(([k, v]) =>
    k !== vectorColumn && SCALAR_NAMES.test(k) && typeof v === 'number' && Number.isFinite(v),
  )
  if (named) return named as [string, number]
  return null
}

function numericDimension(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : null
}

export function extractVectors(result: QueryResult): VectorRow[] {
  return result.result.records.map((record, index) => {
    const values = record.values ?? {}
    const vectorResult = record.vector_results?.find((match) => isNumberArray(match.vector)) ?? null
    const vector = vectorResult?.vector
      ? (['vector_results.vector', vectorResult.vector] satisfies [string, number[]])
      : pickVector(values)
    const scalar = pickScalar(values, vector?.[0] ?? null)
    const dimension = vector?.[1].length
      ?? numericDimension(values.dimension)
      ?? numericDimension(values.vector_dimension)
      ?? 0
    const metadata: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(values)) {
      if (k === vector?.[0] || k === scalar?.[0] || SYSTEM_NAMES.has(k)) continue
      metadata[k] = v
    }
    return {
      index,
      id: String(values.id ?? values.entity_id ?? values.red_entity_id ?? values.rid ?? index + 1),
      vectorColumn: vector?.[0] ?? null,
      vector: vector?.[1] ?? [],
      dimension,
      scalarColumn: scalar?.[0] ?? null,
      scalar: scalar?.[1] ?? null,
      metadata,
    }
  })
}

export function hasVectorShape(result: QueryResult): boolean {
  if (result.capability === 'vector') return true
  if (result.result.records.some((record) => (record.vector_results?.length ?? 0) > 0)) return true
  return extractVectors(result).some((row) => row.vector.length > 0 || row.dimension > 0 || row.scalar !== null)
}

export function vectorMagnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0))
}

export function scalarLabel(row: Pick<VectorRow, 'scalarColumn'>): string {
  if (!row.scalarColumn) return 'TurboVec scalar'
  if (/turbovec/i.test(row.scalarColumn)) return row.scalarColumn
  return `TurboVec scalar · ${row.scalarColumn}`
}

export function compactValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
