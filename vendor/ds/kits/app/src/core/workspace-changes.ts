/** A caller-defined, independently identified staged operation. */
export interface WorkspaceChange {
  id: string;
  error?: string;
}
/** Outcome supplied by the host for a submitted operation. */
export interface WorkspaceChangeOutcome {
  id: string;
  ok: boolean;
  error?: string;
}

/** Stage an operation, replacing a matching operation without changing its identity. */
export function stageWorkspaceChange<Change extends WorkspaceChange>(
  current: readonly Change[], candidate: Change,
  matches: (a: Change, b: Change) => boolean,
  merge: (existing: Change, next: Change) => Change,
): { changes: Change[]; id: string } {
  const index = current.findIndex(change => matches(change, candidate));
  if (index < 0) return { changes: [...current, candidate], id: candidate.id };
  const changes = current.slice();
  const existing = changes[index]!;
  changes[index] = { ...merge(existing, candidate), id: existing.id };
  return { changes, id: existing.id };
}

/**
 * Reconcile a submitted snapshot against the current queue. Newly staged or
 * subsequently edited operations remain; failures are attached only to the
 * submitted revision. The host defines revision equality and how a successful
 * older revision becomes the baseline of a newer one.
 */
export function reconcileWorkspaceChanges<Change extends WorkspaceChange>(
  current: readonly Change[], submitted: readonly Change[], outcomes: readonly WorkspaceChangeOutcome[],
  sameRevision: (current: Change, submitted: Change) => boolean,
  rebase: (current: Change, submitted: Change) => Change,
): { changes: Change[]; applied: number; failed: Change[] } {
  const byId = new Map(outcomes.map(outcome => [outcome.id, outcome]));
  const submittedById = new Map(submitted.map(change => [change.id, change]));
  const failed: Change[] = []; let applied = 0;
  for (const change of submitted) {
    const outcome = byId.get(change.id);
    if (outcome?.ok) applied++;
    else failed.push({ ...change, error: outcome?.error ?? 'commit failed' });
  }
  const changes: Change[] = [];
  for (const change of current) {
    const before = submittedById.get(change.id);
    if (!before) { changes.push(change); continue; }
    const outcome = byId.get(change.id);
    if (!sameRevision(change, before)) {
      changes.push(outcome?.ok ? rebase(change, before) : change);
    } else if (!outcome?.ok) {
      changes.push({ ...change, error: outcome?.error ?? 'commit failed' });
    }
  }
  return { changes, applied, failed };
}
