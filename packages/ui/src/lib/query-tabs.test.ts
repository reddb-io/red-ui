import { describe, expect, it, beforeEach } from 'vitest'
import { queryTabs, deriveQueryLabel } from './query-tabs.svelte'
import type { QueryResult } from '@red-ui/protocol'

beforeEach(() => queryTabs.clear())

const okResult = (sql: string): QueryResult => ({
  ok: true,
  query: sql,
  record_count: 1,
  result: { columns: ['x'], records: [{ values: { x: 1 } }] },
})

describe('queryTabs store', () => {
  it('nextLabel hands out monotonic Query N labels', () => {
    expect(queryTabs.nextLabel()).toBe('Query 1')
    expect(queryTabs.nextLabel()).toBe('Query 2')
    expect(queryTabs.nextLabel()).toBe('Query 3')
  })

  it('ensure() initialises empty state and is idempotent', () => {
    const a = queryTabs.ensure('t1')
    expect(a).toEqual({ sql: '', result: null, error: null, running: false })
    queryTabs.setSql('t1', 'SELECT 1')
    const b = queryTabs.ensure('t1')
    expect(b.sql).toBe('SELECT 1')
  })

  it('isDirty is true only when sql has non-whitespace content', () => {
    queryTabs.ensure('t1')
    expect(queryTabs.isDirty('t1')).toBe(false)
    queryTabs.setSql('t1', '   \n\t  ')
    expect(queryTabs.isDirty('t1')).toBe(false)
    queryTabs.setSql('t1', 'SELECT 1')
    expect(queryTabs.isDirty('t1')).toBe(true)
  })

  it('remove() drops state and isDirty becomes false', () => {
    queryTabs.setSql('t1', 'SELECT 1')
    expect(queryTabs.isDirty('t1')).toBe(true)
    queryTabs.remove('t1')
    expect(queryTabs.has('t1')).toBe(false)
    expect(queryTabs.isDirty('t1')).toBe(false)
  })

  it('run() without executor reports a no-connection error', async () => {
    queryTabs.setSql('t1', 'SELECT 1')
    await queryTabs.run('t1')
    expect(queryTabs.get('t1')?.error).toMatch(/no connection/i)
    expect(queryTabs.get('t1')?.result).toBeNull()
  })

  it('run() with empty sql sets an error without calling the executor', async () => {
    let called = 0
    queryTabs.setExecutor(async (sql) => {
      called++
      return okResult(sql)
    })
    queryTabs.ensure('t1')
    await queryTabs.run('t1')
    expect(called).toBe(0)
    expect(queryTabs.get('t1')?.error).toBe('Empty query.')
  })

  it('run() with executor populates result and clears error', async () => {
    queryTabs.setExecutor(async (sql) => okResult(sql))
    queryTabs.setSql('t1', 'SELECT 1')
    await queryTabs.run('t1')
    const s = queryTabs.get('t1')!
    expect(s.result?.ok).toBe(true)
    expect(s.error).toBeNull()
    expect(s.running).toBe(false)
  })

  it('run() surfaces executor throws as error string', async () => {
    queryTabs.setExecutor(async () => {
      throw new Error('boom')
    })
    queryTabs.setSql('t1', 'SELECT 1')
    await queryTabs.run('t1')
    expect(queryTabs.get('t1')?.error).toBe('boom')
    expect(queryTabs.get('t1')?.result).toBeNull()
  })

  it('run() surfaces ok=false QueryResult error field', async () => {
    queryTabs.setExecutor(async (sql): Promise<QueryResult> => ({
      ok: false,
      query: sql,
      record_count: 0,
      result: { columns: [], records: [] },
      error: 'parse error',
    }))
    queryTabs.setSql('t1', 'SELECT bogus')
    await queryTabs.run('t1')
    expect(queryTabs.get('t1')?.error).toBe('parse error')
  })

  it('multiple query tabs keep independent state', async () => {
    queryTabs.setExecutor(async (sql) => okResult(sql))
    queryTabs.setSql('a', 'SELECT 1')
    queryTabs.setSql('b', 'SELECT 2')
    await queryTabs.run('a')
    await queryTabs.run('b')
    expect(queryTabs.get('a')?.result?.query).toBe('SELECT 1')
    expect(queryTabs.get('b')?.result?.query).toBe('SELECT 2')
    expect(queryTabs.get('a')?.sql).toBe('SELECT 1')
    expect(queryTabs.get('b')?.sql).toBe('SELECT 2')
  })

  it('run() ignores re-entry while already running', async () => {
    let resolveOuter: (r: QueryResult) => void = () => {}
    const pending = new Promise<QueryResult>((res) => {
      resolveOuter = res
    })
    queryTabs.setExecutor(() => pending)
    queryTabs.setSql('t1', 'SELECT slow')
    const first = queryTabs.run('t1')
    // Second call should bail out (running flag set) and resolve immediately.
    await queryTabs.run('t1')
    expect(queryTabs.get('t1')?.running).toBe(true)
    resolveOuter(okResult('SELECT slow'))
    await first
    expect(queryTabs.get('t1')?.running).toBe(false)
  })
})

describe('deriveQueryLabel', () => {
  it('returns the fallback when sql is empty / whitespace', () => {
    expect(deriveQueryLabel('', 'Query 1')).toBe('Query 1')
    expect(deriveQueryLabel('   \n  ', 'Query 2')).toBe('Query 2')
  })

  it('returns the fallback for SELECT *', () => {
    expect(deriveQueryLabel('SELECT * FROM users', 'Query 3')).toBe('Query 3')
  })

  it('returns the fallback when there is no FROM clause', () => {
    expect(deriveQueryLabel('SELECT 1', 'Query 4')).toBe('Query 4')
  })

  it('returns the column list when short enough', () => {
    expect(deriveQueryLabel('SELECT id, name FROM users', 'fb')).toBe('id, name')
  })

  it('truncates long select clauses with an ellipsis', () => {
    const sql = 'SELECT a, b, c, d, e, f, g, h, i, j FROM t'
    const label = deriveQueryLabel(sql, 'fb', 10)
    expect(label.length).toBeLessThanOrEqual(10)
    expect(label.endsWith('…')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(deriveQueryLabel('select id from users', 'fb')).toBe('id')
  })
})
