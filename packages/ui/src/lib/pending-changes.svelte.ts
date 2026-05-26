// PendingChangesPanel — TablePlus-style batch staging for cell edits.
//
// Deep module: staging, preview SQL, and transactional commit live here.
// The Svelte component layer reads `changes`/`count` reactively and calls
// `stage`/`unstage`/`commitAll`/`discardAll`. SQL generation is naive on
// purpose — it assumes reddb's physical `rid` is the row identifier, which
// matches how the TableRenderer passes `row` in from the dataset index.

export interface StagedChange {
  id: string
  table: string
  row: number
  col: string
  oldValue: unknown
  newValue: string
  error?: string
}

export interface CommitOutcome {
  id: string
  ok: boolean
  error?: string
}

export type CommitExecutor = (changes: StagedChange[]) => Promise<CommitOutcome[]>

function quote(v: string): string {
  return `'${v.replace(/'/g, "''")}'`
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function buildUpdateSql(change: StagedChange): string {
  return `UPDATE ${change.table} SET ${change.col} = ${quote(change.newValue)} WHERE rid = ${change.row};`
}

class PendingChangesStore {
  changes = $state<StagedChange[]>([])
  // Reactive count derived from the staged list.
  count = $derived(this.changes.length)

  private executor: CommitExecutor | null = null

  /** Inject the commit backend. Pass null to detach (e.g. on disconnect). */
  setExecutor(fn: CommitExecutor | null): void {
    this.executor = fn
  }

  /**
   * Stage a cell change. If a stage already exists for the same
   * (table, row, col) it is replaced in place (preserving its id and
   * position), so re-editing the same cell never produces duplicates.
   */
  stage(table: string, row: number, col: string, oldValue: unknown, newValue: string): string {
    const idx = this.changes.findIndex(
      (c) => c.table === table && c.row === row && c.col === col,
    )
    if (idx >= 0) {
      const existing = this.changes[idx]
      const updated: StagedChange = {
        ...existing,
        oldValue: existing.oldValue,
        newValue,
        error: undefined,
      }
      const next = this.changes.slice()
      next[idx] = updated
      this.changes = next
      return existing.id
    }
    const id = uid()
    this.changes = [
      ...this.changes,
      { id, table, row, col, oldValue, newValue },
    ]
    return id
  }

  unstage(id: string): void {
    this.changes = this.changes.filter((c) => c.id !== id)
  }

  /** Look up an existing staged change for a given cell. */
  find(table: string, row: number, col: string): StagedChange | undefined {
    return this.changes.find(
      (c) => c.table === table && c.row === row && c.col === col,
    )
  }

  /** SQL preview — one statement per staged change, in insertion order. */
  previewSql(): string[] {
    return this.changes.map(buildUpdateSql)
  }

  /**
   * Apply every staged change via the configured executor. Successful
   * changes are removed from the queue; failures stay staged with their
   * error attached, so the user can retry or unstage them individually.
   */
  async commitAll(): Promise<{ applied: number; failed: StagedChange[] }> {
    if (this.changes.length === 0) return { applied: 0, failed: [] }
    if (!this.executor) throw new Error('PendingChanges: no commit executor configured')

    const snapshot = this.changes.slice()
    const outcomes = await this.executor(snapshot)
    const outcomeById = new Map(outcomes.map((o) => [o.id, o]))

    const failed: StagedChange[] = []
    let applied = 0
    for (const change of snapshot) {
      const outcome = outcomeById.get(change.id)
      if (outcome?.ok) {
        applied += 1
      } else {
        failed.push({ ...change, error: outcome?.error ?? 'commit failed' })
      }
    }

    // Replace the queue: drop committed changes, keep the failures (with
    // any concurrent stages that landed during commitAll preserved).
    const survivorIds = new Set(failed.map((c) => c.id))
    const concurrent = this.changes.filter(
      (c) => !snapshot.some((s) => s.id === c.id),
    )
    const failedById = new Map(failed.map((c) => [c.id, c]))
    this.changes = [
      ...this.changes
        .filter((c) => survivorIds.has(c.id))
        .map((c) => failedById.get(c.id) ?? c),
      ...concurrent,
    ]

    return { applied, failed }
  }

  discardAll(): void {
    this.changes = []
  }

  /** Test helper — reset everything between cases. */
  clear(): void {
    this.changes = []
  }
}

export const pendingChanges = new PendingChangesStore()
export type PendingChangesPanel = PendingChangesStore
