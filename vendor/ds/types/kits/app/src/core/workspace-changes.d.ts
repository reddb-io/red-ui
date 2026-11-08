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
export declare function stageWorkspaceChange<Change extends WorkspaceChange>(current: readonly Change[], candidate: Change, matches: (a: Change, b: Change) => boolean, merge: (existing: Change, next: Change) => Change): {
    changes: Change[];
    id: string;
};
/**
 * Reconcile a submitted snapshot against the current queue. Newly staged or
 * subsequently edited operations remain; failures are attached only to the
 * submitted revision. The host defines revision equality and how a successful
 * older revision becomes the baseline of a newer one.
 */
export declare function reconcileWorkspaceChanges<Change extends WorkspaceChange>(current: readonly Change[], submitted: readonly Change[], outcomes: readonly WorkspaceChangeOutcome[], sameRevision: (current: Change, submitted: Change) => boolean, rebase: (current: Change, submitted: Change) => Change): {
    changes: Change[];
    applied: number;
    failed: Change[];
};
