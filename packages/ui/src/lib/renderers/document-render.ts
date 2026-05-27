import type { QueryResult } from '@red-ui/protocol'

const SYSTEM_FIELDS = new Set(['rid', 'collection', 'kind', 'tenant', 'created_at', 'updated_at', 'body'])

export interface DocumentItem {
  rid: string
  title: string
  subtitle: string
  body: unknown
  fields: Record<string, unknown>
  values: Record<string, unknown>
}

function titleFrom(values: Record<string, unknown>, body: unknown, index: number): string {
  const bodyObject = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  for (const key of ['title', 'name', 'slug', 'id', 'event_type', 'type']) {
    const v = values[key] ?? bodyObject[key]
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number') return String(v)
  }
  const rid = values.rid
  if (typeof rid === 'string' || typeof rid === 'number') return `document ${rid}`
  return `document ${index + 1}`
}

function subtitleFrom(values: Record<string, unknown>, body: unknown): string {
  const bodyObject = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  const parts: string[] = []
  for (const key of ['category', 'source', 'status', 'collection']) {
    const v = values[key] ?? bodyObject[key]
    if (typeof v === 'string' && v.trim()) parts.push(v)
  }
  const updated = values.updated_at ?? values.created_at
  if (typeof updated === 'string' || typeof updated === 'number') parts.push(String(updated))
  return parts.join(' · ')
}

export function extractDocuments(result: QueryResult): DocumentItem[] {
  const docs: DocumentItem[] = []
  for (const [index, record] of result.result.records.entries()) {
    const values = record.values ?? {}
    const body = values.body
    if (values.kind !== 'document' && (body === null || typeof body !== 'object')) continue
    const fields: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(values)) {
      if (SYSTEM_FIELDS.has(key.toLowerCase())) continue
      fields[key] = value
    }
    docs.push({
      rid: String(values.rid ?? index + 1),
      title: titleFrom(values, body, index),
      subtitle: subtitleFrom(values, body),
      body,
      fields,
      values,
    })
  }
  return docs
}

export function hasDocumentShape(result: QueryResult): boolean {
  if (result.capability === 'document') return true
  return extractDocuments(result).length > 0
}
