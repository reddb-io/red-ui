// PendingChangesPanel — TablePlus-style batch staging for cell edits.
//
// Deep module: staging, preview SQL, and transactional commit live here.
// The Svelte component layer reads `changes`/`count` reactively and calls
// `stage`/`unstage`/`commitAll`/`discardAll`. Table edits identify rows by
// RedDB's physical `rid`; the adapter validates and constructs update SQL.

import {
  stageWorkspaceChange,
  reconcileWorkspaceChanges,
} from "@reddb-io/design-system/app/workspace/changes";
import { buildUpdateSql as buildRedDbUpdateSql } from "@reddb-io/design-system/adapters/reddb/change-sql";

export interface StagedChange {
  id: string;
  table: string;
  row: number;
  col: string;
  oldValue: unknown;
  newValue: string;
  error?: string;
}

/** Keep the existing staged-change entry point while delegating SQL to the adapter. */
export function buildUpdateSql(change: StagedChange): string {
  return buildRedDbUpdateSql(change);
}

export interface CommitOutcome {
  id: string;
  ok: boolean;
  error?: string;
}

export type CommitExecutor = (
  changes: StagedChange[]
) => Promise<CommitOutcome[]>;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class PendingChangesStore {
  private disposed = false;
  changes = $state<StagedChange[]>([]);
  // Reactive count derived from the staged list.
  count = $derived(this.changes.length);

  private executor: CommitExecutor | null = null;

  /** Inject the commit backend. Pass null to detach (e.g. on disconnect). */
  setExecutor(fn: CommitExecutor | null): void {
    this.executor = fn;
  }

  /**
   * Stage a cell change. If a stage already exists for the same
   * (table, row, col) it is replaced in place (preserving its id and
   * position), so re-editing the same cell never produces duplicates.
   */
  stage(
    table: string,
    row: number,
    col: string,
    oldValue: unknown,
    newValue: string
  ): string {
    if (this.disposed) throw new Error("Workspace is disposed");
    const staged = stageWorkspaceChange(
      this.changes,
      { id: uid(), table, row, col, oldValue, newValue },
      (a, b) => a.table === b.table && a.row === b.row && a.col === b.col,
      (existing, next) => ({
        ...existing,
        newValue: next.newValue,
        error: undefined,
      })
    );
    this.changes = staged.changes;
    return staged.id;
  }

  unstage(id: string): void {
    this.changes = this.changes.filter((c) => c.id !== id);
  }

  /** Look up an existing staged change for a given cell. */
  find(table: string, row: number, col: string): StagedChange | undefined {
    return this.changes.find(
      (c) => c.table === table && c.row === row && c.col === col
    );
  }

  /** SQL preview — one statement per staged change, in insertion order. */
  previewSql(): string[] {
    return this.changes.map(buildUpdateSql);
  }

  /**
   * Apply every staged change via the configured executor. Successful
   * changes are removed from the queue; failures stay staged with their
   * error attached, so the user can retry or unstage them individually.
   */
  async commitAll(): Promise<{ applied: number; failed: StagedChange[] }> {
    if (this.disposed) throw new Error("Workspace is disposed");
    if (this.changes.length === 0) return { applied: 0, failed: [] };
    if (!this.executor)
      throw new Error("PendingChanges: no commit executor configured");

    const snapshot = this.changes.slice();
    const outcomes = await this.executor(snapshot);
    const result = reconcileWorkspaceChanges(
      this.changes,
      snapshot,
      outcomes,
      (current, submitted) => current.newValue === submitted.newValue,
      (current, submitted) => ({
        ...current,
        oldValue: submitted.newValue,
        error: undefined,
      })
    );
    if (!this.disposed) this.changes = result.changes;
    return { applied: result.applied, failed: result.failed };
  }

  discardAll(): void {
    this.changes = [];
  }

  /** Test helper — reset everything between cases. */
  clear(): void {
    this.changes = [];
  }

  dispose(): void {
    this.disposed = true;
    this.executor = null;
    this.clear();
  }
}

export const pendingChanges = new PendingChangesStore();
export type PendingChangesPanel = PendingChangesStore;
