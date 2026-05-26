// Pure rendering helpers for the table capability. Used by both the
// Svelte TableRenderer component (for live UI) and the golden snapshot
// test (which needs a DOM-free representation).

import type { QueryResult } from '@red-ui/protocol'

export const TABLE_ROW_LIMIT = 80
export const ELLIPSIS_AT = 64

/**
 * reddb's reserved public item fields. The server enforces these as
 * unwritable by users (see `crates/reddb-server/src/reserved_fields.rs`)
 * and stamps them onto every read. The UI hides them by default so the
 * user-defined shape is visible; a toggle reintroduces them as a
 * prefix block.
 */
export const SYSTEM_FIELDS = [
  'rid',
  'collection',
  'kind',
  'tenant',
  'created_at',
  'updated_at',
] as const
const SYSTEM_SET = new Set<string>(SYSTEM_FIELDS)

export function isSystemField(column: string): boolean {
  return SYSTEM_SET.has(column.toLowerCase())
}

export interface VisibleColumnsOptions {
  /** When true, reddb system fields lead; when false (default) they're hidden. */
  showSystem?: boolean
}

export function visibleColumns(
  result: QueryResult,
  opts: VisibleColumnsOptions = {},
): string[] {
  const all = result.result.columns
  // `red_*` and `body` are noise even in show-system mode — the row is
  // already unrolled, and red_* are internal-only.
  const usable = all.filter((c) => !c.startsWith('red_') && c !== 'body')

  const userCols = usable.filter((c) => !isSystemField(c))
  const id = userCols.find((c) => c.toLowerCase() === 'id')
  const userRest = userCols.filter((c) => c !== id)
  const userOrdered = [id, ...userRest].filter((c): c is string => Boolean(c))

  if (!opts.showSystem) {
    return userOrdered.length > 0 ? userOrdered : all
  }

  // System block, in canonical order (rid first — it's the actual address).
  const systemOrdered = SYSTEM_FIELDS.filter((f) => usable.includes(f))
  return [...systemOrdered, ...userOrdered]
}

export type IdentityKind = 'rid' | 'id'

export function identityKind(column: string): IdentityKind | null {
  const c = column.toLowerCase()
  if (c === 'rid') return 'rid'
  if (c === 'id') return 'id'
  return null
}

export function inferPkColumn(columns: string[]): string | null {
  // rid wins — it's the system-assigned row id and the actual key
  // reddb uses to address documents. id is user-defined and may not be unique.
  return (
    columns.find((c) => c.toLowerCase() === 'rid') ??
    columns.find((c) => c.toLowerCase() === 'id') ??
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
export function renderTableHtml(
  result: QueryResult,
  opts: VisibleColumnsOptions = {},
): string {
  const columns = visibleColumns(result, opts)
  const pk = inferPkColumn(columns)
  const rows = visibleRows(result)
  const lines: string[] = []
  lines.push('<table>')
  lines.push('<thead><tr>')
  lines.push('<th class="num">#</th>')
  for (const c of columns) {
    const kind = identityKind(c)
    const mark = kind === 'rid'
      ? '<span class="badge sys">sys</span>'
      : kind === 'id'
        ? '<span class="badge pk">pk</span>'
        : c === pk
          ? '<span class="badge pk">pk</span>'
          : ''
    const cls = kind ? ` class="id ${kind}"` : ''
    lines.push(`<th${cls}>${escapeHtml(c)}${mark}</th>`)
  }
  lines.push('</tr></thead>')
  lines.push('<tbody>')
  rows.forEach((row, i) => {
    lines.push('<tr>')
    lines.push(`<td class="num">${i + 1}</td>`)
    for (const c of columns) {
      const v = row[c]
      const kind = identityKind(c)
      const cls = kind ? ` class="id ${kind}"` : ''
      if (isNull(v)) {
        lines.push(`<td${cls}><span class="null">NULL</span></td>`)
      } else {
        lines.push(`<td${cls}><span class="cell">${escapeHtml(ellipsize(formatCell(v)))}</span></td>`)
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
