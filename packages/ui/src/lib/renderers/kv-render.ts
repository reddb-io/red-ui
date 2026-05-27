// Pure rendering helpers for the KV capability. The KV renderer shows a
// tree of keys split on `/` plus a per-key value preview, so a user
// browsing `config/auth/jwt` sees the `config → auth → jwt` hierarchy
// rather than 800 flat rows.

import type { QueryResult } from '@red-ui/protocol'

export interface KvEntry {
  key: string
  value: unknown
}

export interface KvNode {
  /** Last segment of the path (display label). */
  name: string
  /** Full key when this node represents an actual entry; null for purely structural nodes. */
  fullKey: string | null
  value: unknown
  /** Direct children indexed by segment name, kept sorted on insert. */
  children: KvNode[]
}

function findKeyCol(cols: ReadonlyArray<string>): string | null {
  // Exact preferred names, then any column ending in `_key` (our seed uses
  // `fact_key`/`fact_value`; other apps might use `cfg_key`, etc).
  return (
    cols.find((c) => c.toLowerCase() === 'key') ??
    cols.find((c) => c.toLowerCase() === 'k') ??
    cols.find((c) => /(^|_)key$/i.test(c)) ??
    null
  )
}

function findValueCol(cols: ReadonlyArray<string>): string | null {
  return (
    cols.find((c) => c.toLowerCase() === 'value') ??
    cols.find((c) => c.toLowerCase() === 'v') ??
    cols.find((c) => /(^|_)value$/i.test(c)) ??
    null
  )
}

export function extractKv(result: QueryResult): KvEntry[] {
  const cols = result.result.columns
  const keyCol = findKeyCol(cols)
  const valueCol = findValueCol(cols)
  if (!keyCol || !valueCol) return []
  return result.result.records.map((r) => ({
    key: String(r.values[keyCol] ?? ''),
    value: r.values[valueCol],
  }))
}

export function hasKvShape(result: QueryResult): boolean {
  const cols = result.result?.columns ?? []
  return findKeyCol(cols) !== null && findValueCol(cols) !== null
}

/**
 * Flatten a KV tree under `prefix` into a plain object so the toolbar's
 * JSON view can render the prefix as a single navigable record.
 */
export function flattenUnderPrefix(entries: KvEntry[], prefix: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const e of entries) {
    if (!e.key.startsWith(prefix)) continue
    const rest = e.key.slice(prefix.length).replace(/^\/+/, '')
    if (!rest) {
      // exact match → use a sentinel "$value" so the prefix root has a slot
      out.$value = e.value
      continue
    }
    out[rest] = e.value
  }
  return out
}

/**
 * Materialize slash-delimited KV keys as a nested JSON object. Exact prefix
 * values share space with children through `$value`, so `a=1` and `a/b=2`
 * remain representable without dropping either value.
 */
export function materializeKvJson(entries: KvEntry[], prefix: string): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  for (const entry of entries) {
    if (!entry.key.startsWith(prefix)) continue
    const rest = entry.key.slice(prefix.length).replace(/^\/+/, '')
    const segments = rest.split('/').filter(Boolean)
    if (segments.length === 0) {
      root.$value = entry.value
      continue
    }
    let cursor = root
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i]
      if (i === segments.length - 1) {
        const existing = cursor[segment]
        if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
          ;(existing as Record<string, unknown>).$value = entry.value
        } else {
          cursor[segment] = entry.value
        }
        continue
      }
      const existing = cursor[segment]
      if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
        const next: Record<string, unknown> = {}
        if (existing !== undefined) next.$value = existing
        cursor[segment] = next
        cursor = next
      } else {
        cursor = existing as Record<string, unknown>
      }
    }
  }
  return root
}

export function buildTree(entries: KvEntry[]): KvNode {
  const root: KvNode = { name: '', fullKey: null, value: undefined, children: [] }
  for (const entry of entries) {
    const segments = entry.key.split('/').filter((s) => s.length > 0)
    if (segments.length === 0) continue
    let cursor = root
    segments.forEach((seg, i) => {
      let child = cursor.children.find((c) => c.name === seg)
      if (!child) {
        child = { name: seg, fullKey: null, value: undefined, children: [] }
        // Insert in sorted order so output is deterministic.
        const idx = cursor.children.findIndex((c) => c.name > seg)
        if (idx < 0) cursor.children.push(child)
        else cursor.children.splice(idx, 0, child)
      }
      if (i === segments.length - 1) {
        child.fullKey = entry.key
        child.value = entry.value
      }
      cursor = child
    })
  }
  return root
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function renderKvHtml(result: QueryResult): string {
  const entries = extractKv(result)
  const tree = buildTree(entries)
  const lines: string[] = []
  lines.push('<section class="kv">')
  lines.push(`<header class="summary">${entries.length} keys</header>`)
  lines.push('<ul class="tree">')
  for (const child of tree.children) {
    walk(child, 0, lines)
  }
  lines.push('</ul>')
  lines.push('</section>')
  return lines.join('')
}

function walk(node: KvNode, depth: number, out: string[]): void {
  const hasValue = node.fullKey !== null
  const cls = ['node']
  if (hasValue) cls.push('leaf')
  out.push(`<li class="${cls.join(' ')}" data-depth="${depth}">`)
  out.push(`<span class="seg">${escapeHtml(node.name)}</span>`)
  if (hasValue) {
    out.push(`<span class="val">${escapeHtml(truncate(formatValue(node.value)))}</span>`)
  }
  if (node.children.length > 0) {
    out.push('<ul class="children">')
    for (const child of node.children) walk(child, depth + 1, out)
    out.push('</ul>')
  }
  out.push('</li>')
}

function truncate(s: string, max = 80): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
