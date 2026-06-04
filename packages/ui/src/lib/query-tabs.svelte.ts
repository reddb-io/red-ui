// Per-query-tab state — keyed on tab id from the tabs store.
//
// Each query tab carries its own editor text, last result, error, and
// running flag. Stored separately from the tabs store so the Tab type
// stays a thin identity record and switching tabs preserves state.

import { activity } from "./activity.svelte";
import type { QueryResult } from "#reddb";

export interface QueryTabState {
  sql: string;
  result: QueryResult | null;
  error: string | null;
  running: boolean;
  runningStartedAt: number | null;
}

export interface QueryRunOptions {
  signal?: AbortSignal;
}

export type QueryExecutor = (
  sql: string,
  options?: QueryRunOptions
) => Promise<QueryResult>;

function emptyState(): QueryTabState {
  return {
    sql: "",
    result: null,
    error: null,
    running: false,
    runningStartedAt: null,
  };
}

function queryActivityLabel(sql: string): string {
  const oneLine = sql.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 80) return `query · ${oneLine}`;
  return `query · ${oneLine.slice(0, 79).trimEnd()}…`;
}

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

class QueryTabsStore {
  /** Per-tab state keyed by tab id. */
  states = $state<Record<string, QueryTabState>>({});
  /** Monotonic counter for "Query N" labels — survives close so numbers don't reuse. */
  private counter = 0;
  private executor: QueryExecutor | null = null;
  private runSeq = 0;
  private inFlight = new Map<
    string,
    { token: number; controller: AbortController }
  >();

  setExecutor(executor: QueryExecutor | null): void {
    this.executor = executor;
  }

  nextLabel(): string {
    this.counter += 1;
    return `Query ${this.counter}`;
  }

  ensure(id: string): QueryTabState {
    if (!this.states[id]) this.states[id] = emptyState();
    return this.states[id];
  }

  setSql(id: string, sql: string): void {
    const s = this.ensure(id);
    s.sql = sql;
  }

  get(id: string): QueryTabState | undefined {
    return this.states[id];
  }

  has(id: string): boolean {
    return this.states[id] !== undefined;
  }

  remove(id: string): void {
    this.cancel(id);
    delete this.states[id];
  }

  /**
   * Returns true when the tab has user-entered text (after trimming) that
   * was not produced by a successful run. Used to gate the close
   * confirmation.
   */
  isDirty(id: string): boolean {
    const s = this.states[id];
    if (!s) return false;
    return s.sql.trim().length > 0;
  }

  /**
   * Run the tab's current sql through the wired executor. Updates result,
   * error, running, in place. Safe to call concurrently per tab — the
   * running flag guards against re-entry.
   */
  async run(id: string): Promise<void> {
    const s = this.ensure(id);
    if (s.running) return;
    if (!this.executor) {
      s.error = "No connection — connect to a reddb instance first.";
      s.result = null;
      return;
    }
    const sql = s.sql.trim();
    if (!sql) {
      s.error = "Empty query.";
      s.result = null;
      return;
    }
    const controller = new AbortController();
    const token = ++this.runSeq;
    this.inFlight.set(id, { token, controller });
    s.running = true;
    s.runningStartedAt = Date.now();
    s.error = null;
    try {
      const r = await activity.track(queryActivityLabel(sql), () =>
        this.executor!(sql, { signal: controller.signal })
      );
      if (this.inFlight.get(id)?.token !== token) return;
      s.result = r;
      s.error = r.ok ? null : (r.error ?? "Query failed.");
    } catch (e) {
      if (this.inFlight.get(id)?.token !== token) return;
      if (controller.signal.aborted || isAbortError(e)) {
        s.error = null;
        return;
      }
      s.error = (e as Error).message;
      s.result = null;
    } finally {
      if (this.inFlight.get(id)?.token === token) {
        this.inFlight.delete(id);
        s.running = false;
        s.runningStartedAt = null;
      }
    }
  }

  cancel(id: string): boolean {
    const run = this.inFlight.get(id);
    if (!run) return false;
    this.inFlight.delete(id);
    run.controller.abort();
    const s = this.states[id];
    if (s) {
      s.running = false;
      s.runningStartedAt = null;
      s.error = null;
    }
    return true;
  }

  /** Test-only reset. */
  clear(): void {
    for (const run of this.inFlight.values()) run.controller.abort();
    this.inFlight.clear();
    this.states = {};
    this.counter = 0;
    this.executor = null;
    this.runSeq = 0;
  }
}

export const queryTabs = new QueryTabsStore();

/**
 * Derive a tab title from the SQL text. Defaults to `fallback` (e.g.
 * "Query 3") when the SQL is empty or the SELECT clause is missing /
 * trivial.
 *
 * Kept pure & exported for unit tests.
 */
export function deriveQueryLabel(
  sql: string,
  fallback: string,
  max = 24
): string {
  const trimmed = sql.trim();
  if (!trimmed) return fallback;
  const match = trimmed.match(/^\s*select\s+([\s\S]+?)\s+from\b/i);
  if (!match) return fallback;
  const clause = match[1].replace(/\s+/g, " ").trim();
  if (!clause || clause === "*") return fallback;
  if (clause.length <= max) return clause;
  return clause.slice(0, max - 1).trimEnd() + "…";
}
