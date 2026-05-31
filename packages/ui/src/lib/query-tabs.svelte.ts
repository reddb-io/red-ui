// Per-query-tab state — keyed on tab id from the tabs store.
//
// Each query tab carries its own editor text, last result, error, and
// running flag. Stored separately from the tabs store so the Tab type
// stays a thin identity record and switching tabs preserves state.

import type { QueryResult } from '#reddb'

export interface QueryTabState {
  sql: string
  result: QueryResult | null
  error: string | null
  running: boolean
}

export type QueryExecutor = (sql: string) => Promise<QueryResult>

function emptyState(): QueryTabState {
  return { sql: '', result: null, error: null, running: false }
}

class QueryTabsStore {
  /** Per-tab state keyed by tab id. */
  states = $state<Record<string, QueryTabState>>({})
  /** Monotonic counter for "Query N" labels — survives close so numbers don't reuse. */
  private counter = 0
  private executor: QueryExecutor | null = null

  setExecutor(executor: QueryExecutor | null): void {
    this.executor = executor
  }

  nextLabel(): string {
    this.counter += 1
    return `Query ${this.counter}`
  }

  ensure(id: string): QueryTabState {
    if (!this.states[id]) this.states[id] = emptyState()
    return this.states[id]
  }

  setSql(id: string, sql: string): void {
    const s = this.ensure(id)
    s.sql = sql
  }

  get(id: string): QueryTabState | undefined {
    return this.states[id]
  }

  has(id: string): boolean {
    return this.states[id] !== undefined
  }

  remove(id: string): void {
    delete this.states[id]
  }

  /**
   * Returns true when the tab has user-entered text (after trimming) that
   * was not produced by a successful run. Used to gate the close
   * confirmation.
   */
  isDirty(id: string): boolean {
    const s = this.states[id]
    if (!s) return false
    return s.sql.trim().length > 0
  }

  /**
   * Run the tab's current sql through the wired executor. Updates result,
   * error, running, in place. Safe to call concurrently per tab — the
   * running flag guards against re-entry.
   */
  async run(id: string): Promise<void> {
    const s = this.ensure(id)
    if (s.running) return
    if (!this.executor) {
      s.error = 'No connection — connect to a reddb instance first.'
      s.result = null
      return
    }
    const sql = s.sql.trim()
    if (!sql) {
      s.error = 'Empty query.'
      s.result = null
      return
    }
    s.running = true
    s.error = null
    try {
      const r = await this.executor(sql)
      s.result = r
      s.error = r.ok ? null : (r.error ?? 'Query failed.')
    } catch (e) {
      s.error = (e as Error).message
      s.result = null
    } finally {
      s.running = false
    }
  }

  /** Test-only reset. */
  clear(): void {
    this.states = {}
    this.counter = 0
    this.executor = null
  }
}

export const queryTabs = new QueryTabsStore()

/**
 * Derive a tab title from the SQL text. Defaults to `fallback` (e.g.
 * "Query 3") when the SQL is empty or the SELECT clause is missing /
 * trivial.
 *
 * Kept pure & exported for unit tests.
 */
export function deriveQueryLabel(sql: string, fallback: string, max = 24): string {
  const trimmed = sql.trim()
  if (!trimmed) return fallback
  const match = trimmed.match(/^\s*select\s+([\s\S]+?)\s+from\b/i)
  if (!match) return fallback
  const clause = match[1].replace(/\s+/g, ' ').trim()
  if (!clause || clause === '*') return fallback
  if (clause.length <= max) return clause
  return clause.slice(0, max - 1).trimEnd() + '…'
}
