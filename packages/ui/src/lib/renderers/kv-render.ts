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

export function extractKv(result: QueryResult): KvEntry[] {
  const cols = result.result.columns
  const keyCol =
    cols.find((c) => c === 'key') ??
    cols.find((c) => c === 'k') ??
    cols.find((c) => c.toLowerCase() === 'key')
  const valueCol =
    cols.find((c) => c === 'value') ??
    cols.find((c) => c === 'v') ??
    cols.find((c) => c.toLowerCase() === 'value')
  if (!keyCol || !valueCol) return []
  return result.result.records.map((r) => ({
    key: String(r.values[keyCol] ?? ''),
    value: r.values[valueCol],
  }))
}

export function hasKvShape(result: QueryResult): boolean {
  const cols = result.result?.columns ?? []
  const lower = cols.map((c) => c.toLowerCase())
  return (
    (lower.includes('key') || lower.includes('k')) &&
    (lower.includes('value') || lower.includes('v'))
  )
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
