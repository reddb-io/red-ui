// Pure rendering helpers for the table capability. Used by both the
// Svelte TableRenderer component (for live UI) and the golden snapshot
// test (which needs a DOM-free representation).

import type { QueryResult } from '@red-ui/protocol'

export const TABLE_ROW_LIMIT = 80
export const ELLIPSIS_AT = 64

export function visibleColumns(result: QueryResult): string[] {
  const all = result.result.columns
  const filtered = all.filter(
    (c) => !c.startsWith('red_') && c !== 'body' && c !== 'created_at' && c !== 'updated_at',
  )
  return filtered.length > 0 ? filtered : all
}

export function inferPkColumn(columns: string[]): string | null {
  return (
    columns.find((c) => c.toLowerCase() === 'id') ??
    columns.find((c) => c.toLowerCase() === 'rid') ??
    columns.find((c) => c.toLowerCase().endsWith('_id')) ??
    columns[0] ??
    null
  )
}

export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function isNull(v: unknown): boolean {
  return v === null || v === undefined
}

export function ellipsize(s: string, max = ELLIPSIS_AT): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

export function visibleRows(result: QueryResult, limit = TABLE_ROW_LIMIT): Array<Record<string, unknown>> {
  return result.result.records.slice(0, limit).map((rec) => rec.values)
}

/**
 * Produce a stable, DOM-free HTML string for the given query result.
 * Used by the golden snapshot test. Intentionally minimal: no inline
 * styles, no event handlers, no editing affordances — those live in the
 * Svelte component.
 */
export function renderTableHtml(result: QueryResult): string {
  const columns = visibleColumns(result)
  const pk = inferPkColumn(columns)
  const rows = visibleRows(result)
  const lines: string[] = []
  lines.push('<table>')
  lines.push('<thead><tr>')
  lines.push('<th class="num">#</th>')
  for (const c of columns) {
    const pkMark = c === pk ? '<span class="pk">pk</span>' : ''
    lines.push(`<th>${escapeHtml(c)}${pkMark}</th>`)
  }
  lines.push('</tr></thead>')
  lines.push('<tbody>')
  rows.forEach((row, i) => {
    lines.push('<tr>')
    lines.push(`<td class="num">${i + 1}</td>`)
    for (const c of columns) {
      const v = row[c]
      if (isNull(v)) {
        lines.push('<td><span class="null">NULL</span></td>')
      } else {
        lines.push(`<td><span class="cell">${escapeHtml(ellipsize(formatCell(v)))}</span></td>`)
      }
    }
    lines.push('</tr>')
  })
  lines.push('</tbody>')
  lines.push('</table>')
  return lines.join('')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
