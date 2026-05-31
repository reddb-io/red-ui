import { describe, expect, it } from 'vitest'
import type { QueryResult } from '#reddb'
import { buildTree, extractKv, hasKvShape, materializeKvJson, renderKvHtml } from './kv-render'

const FIXTURE: QueryResult = {
  ok: true,
  query: 'SELECT key, value FROM config',
  capability: 'kv',
  record_count: 3,
  result: {
    columns: ['key', 'value'],
    records: [
      { values: { key: 'config/auth/jwt', value: 'secret' } },
      { values: { key: 'config/auth/ttl', value: 3600 } },
      { values: { key: 'config/db/url', value: 'red://localhost' } },
    ],
  },
}

describe('hasKvShape', () => {
  it('accepts key+value columns', () => {
    expect(hasKvShape(FIXTURE)).toBe(true)
  })

  it('accepts k+v shorthand', () => {
    const r: QueryResult = {
      ...FIXTURE,
      result: { columns: ['k', 'v'], records: [] },
    }
    expect(hasKvShape(r)).toBe(true)
  })

  it('rejects non-kv results', () => {
    const r: QueryResult = {
      ok: true,
      query: '',
      record_count: 0,
      result: { columns: ['id', 'name'], records: [] },
    }
    expect(hasKvShape(r)).toBe(false)
  })
})

describe('extractKv', () => {
  it('pulls (key, value) pairs from the result', () => {
    const entries = extractKv(FIXTURE)
    expect(entries).toEqual([
      { key: 'config/auth/jwt', value: 'secret' },
      { key: 'config/auth/ttl', value: 3600 },
      { key: 'config/db/url', value: 'red://localhost' },
    ])
  })
})

describe('buildTree', () => {
  it('splits keys on `/` and groups by prefix', () => {
    const tree = buildTree(extractKv(FIXTURE))
    expect(tree.children).toHaveLength(1)
    const config = tree.children[0]
    expect(config.name).toBe('config')
    expect(config.children.map((c) => c.name)).toEqual(['auth', 'db'])
    const auth = config.children[0]
    expect(auth.children.map((c) => c.name)).toEqual(['jwt', 'ttl'])
    expect(auth.children[0].fullKey).toBe('config/auth/jwt')
    expect(auth.children[0].value).toBe('secret')
  })
})

describe('materializeKvJson', () => {
  it('turns slash-delimited keys into nested JSON', () => {
    expect(materializeKvJson(extractKv(FIXTURE), '')).toEqual({
      config: {
        auth: {
          jwt: 'secret',
          ttl: 3600,
        },
        db: {
          url: 'red://localhost',
        },
      },
    })
  })

  it('keeps exact prefix values under $value when children also exist', () => {
    const entries = [
      { key: 'config/auth', value: 'enabled' },
      { key: 'config/auth/ttl', value: 3600 },
    ]
    expect(materializeKvJson(entries, 'config/auth')).toEqual({
      $value: 'enabled',
      ttl: 3600,
    })
  })
})

describe('renderKvHtml (golden snapshot)', () => {
  it('matches the captured snapshot for the fixture', () => {
    expect(renderKvHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<section class="kv"><header class="summary">3 keys</header><ul class="tree"><li class="node" data-depth="0"><span class="seg">config</span><ul class="children"><li class="node" data-depth="1"><span class="seg">auth</span><ul class="children"><li class="node leaf" data-depth="2"><span class="seg">jwt</span><span class="val">secret</span></li><li class="node leaf" data-depth="2"><span class="seg">ttl</span><span class="val">3600</span></li></ul></li><li class="node" data-depth="1"><span class="seg">db</span><ul class="children"><li class="node leaf" data-depth="2"><span class="seg">url</span><span class="val">red://localhost</span></li></ul></li></ul></li></ul></section>"`,
    )
  })
})
