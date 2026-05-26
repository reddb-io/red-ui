import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@red-ui/protocol'
import {
  ellipsize,
  inferPkColumn,
  renderTableHtml,
  visibleColumns,
} from './table-render'

const FIXTURE: QueryResult = {
  ok: true,
  query: 'SELECT * FROM users LIMIT 3',
  capability: 'table',
  record_count: 3,
  result: {
    columns: ['rid', 'collection', 'kind', 'id', 'name', 'email', 'created_at', 'red_internal'],
    records: [
      { values: { rid: 101, collection: 'users', kind: 'document', id: 1, name: 'Ada', email: 'ada@example.com', created_at: 'x', red_internal: 'x' } },
      { values: { rid: 102, collection: 'users', kind: 'document', id: 2, name: 'Grace', email: null, created_at: 'x', red_internal: 'x' } },
      { values: { rid: 103, collection: 'users', kind: 'document', id: 3, name: 'A very very very very very very very very long name that should be truncated', email: 'g@example.com', created_at: 'x', red_internal: 'x' } },
    ],
  },
}

describe('visibleColumns', () => {
  it('hides system fields and red_* by default; id leads user columns', () => {
    expect(visibleColumns(FIXTURE)).toEqual(['id', 'name', 'email'])
  })

  it('with showSystem, system fields lead in canonical order then user columns', () => {
    expect(visibleColumns(FIXTURE, { showSystem: true })).toEqual([
      'rid', 'collection', 'kind', 'created_at',
      'id', 'name', 'email',
    ])
  })

  it('falls back to all columns when the filter would empty everything', () => {
    const all: QueryResult = {
      ...FIXTURE,
      result: { columns: ['red_a', 'red_b'], records: [] },
    }
    expect(visibleColumns(all)).toEqual(['red_a', 'red_b'])
  })

  it('keeps showSystem ordering stable regardless of source order', () => {
    const r: QueryResult = {
      ...FIXTURE,
      result: { columns: ['name', 'tenant', 'email', 'id', 'updated_at', 'rid', 'created_at'], records: [] },
    }
    expect(visibleColumns(r, { showSystem: true })).toEqual([
      'rid', 'tenant', 'created_at', 'updated_at',
      'id', 'name', 'email',
    ])
  })
})

describe('inferPkColumn', () => {
  it('prefers rid (system), then id (user), then *_id, then first column', () => {
    expect(inferPkColumn(['x', 'id', 'rid'])).toBe('rid')
    expect(inferPkColumn(['x', 'id'])).toBe('id')
    expect(inferPkColumn(['name', 'tenant_id'])).toBe('tenant_id')
    expect(inferPkColumn(['name', 'email'])).toBe('name')
    expect(inferPkColumn([])).toBe(null)
  })
})

describe('ellipsize', () => {
  it('truncates with an ellipsis past the limit', () => {
    expect(ellipsize('abcdef', 6)).toBe('abcdef')
    expect(ellipsize('abcdefg', 6)).toBe('abcde…')
  })
})

describe('renderTableHtml (golden snapshot)', () => {
  it('matches the captured snapshot for the fixture', () => {
    expect(renderTableHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<table><thead><tr><th class="num">#</th><th class="id id">id<span class="badge pk">pk</span></th><th>name</th><th>email</th></tr></thead><tbody><tr><td class="num">1</td><td class="id id"><span class="cell">1</span></td><td><span class="cell">Ada</span></td><td><span class="cell">ada@example.com</span></td></tr><tr><td class="num">2</td><td class="id id"><span class="cell">2</span></td><td><span class="cell">Grace</span></td><td><span class="null">NULL</span></td></tr><tr><td class="num">3</td><td class="id id"><span class="cell">3</span></td><td><span class="cell">A very very very very very very very very long name that should…</span></td><td><span class="cell">g@example.com</span></td></tr></tbody></table>"`,
    )
  })

  it('with showSystem prefixes the system block with sys-marked rid', () => {
    const html = renderTableHtml(FIXTURE, { showSystem: true })
    expect(html).toContain('<th class="id rid">rid<span class="badge sys">sys</span>')
    // Order check — rid before id in the header row.
    expect(html.indexOf('>rid<')).toBeLessThan(html.indexOf('>id<'))
  })

  it('honors the 80-row LIMIT', () => {
    const big: QueryResult = {
      ok: true,
      query: '',
      record_count: 200,
      result: {
        columns: ['id'],
        records: Array.from({ length: 200 }, (_, i) => ({ values: { id: i } })),
      },
    }
    const html = renderTableHtml(big)
    const rowCount = (html.match(/<tr>/g) ?? []).length - 1 // minus header
    expect(rowCount).toBe(80)
  })

  it('renders NULL marker for null/undefined cells', () => {
    expect(renderTableHtml(FIXTURE)).toContain('<span class="null">NULL</span>')
  })
})
