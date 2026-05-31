import { describe, expect, it } from 'vitest'
import type { QueryResult } from '#reddb'
import { highlightJson, prettyJson, projectJson, renderJsonHtml } from './json-render'

const FIXTURE: QueryResult = {
  ok: true,
  query: 'SELECT * FROM users LIMIT 1',
  capability: 'table',
  record_count: 1,
  result: {
    columns: ['id', 'name', 'active'],
    records: [{ values: { id: 1, name: 'Ada', active: true } }],
  },
}

describe('projectJson', () => {
  it('strips the envelope to query/capability/count/records', () => {
    const p = projectJson(FIXTURE) as Record<string, unknown>
    expect(Object.keys(p).sort()).toEqual(['capability', 'query', 'record_count', 'records'])
    expect(p.records).toEqual(FIXTURE.result.records)
  })
})

describe('highlightJson', () => {
  it('marks keys, strings, numbers, booleans, and nulls', () => {
    const html = highlightJson(prettyJson({ a: 'b', n: 1, t: true, z: null }))
    expect(html).toContain('<span class="k">"a"</span>')
    expect(html).toContain('<span class="s">"b"</span>')
    expect(html).toContain('<span class="n">1</span>')
    expect(html).toContain('<span class="b">true</span>')
    expect(html).toContain('<span class="z">null</span>')
  })

  it('escapes html characters inside string values', () => {
    const html = highlightJson(prettyJson({ k: '<script>' }))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('renderJsonHtml (golden snapshot)', () => {
  it('matches the captured snapshot for the fixture', () => {
    expect(renderJsonHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<pre class="json">{
  <span class="k">"query"</span>: <span class="s">"SELECT * FROM users LIMIT 1"</span>,
  <span class="k">"capability"</span>: <span class="s">"table"</span>,
  <span class="k">"record_count"</span>: <span class="n">1</span>,
  <span class="k">"records"</span>: [
    {
      <span class="k">"values"</span>: {
        <span class="k">"id"</span>: <span class="n">1</span>,
        <span class="k">"name"</span>: <span class="s">"Ada"</span>,
        <span class="k">"active"</span>: <span class="b">true</span>
      }
    }
  ]
}</pre>"`,
    )
  })
})
