import { describe, expect, it, beforeEach } from 'vitest'
import { pendingChanges, buildUpdateSql, type CommitOutcome } from './pending-changes.svelte'

beforeEach(() => {
  pendingChanges.clear()
  pendingChanges.setExecutor(null)
})

describe('PendingChangesPanel', () => {
  it('stage + unstage round-trip', () => {
    const id = pendingChanges.stage('users', 1, 'name', 'Alice', 'Bob')
    expect(pendingChanges.count).toBe(1)
    expect(pendingChanges.find('users', 1, 'name')?.newValue).toBe('Bob')
    pendingChanges.unstage(id)
    expect(pendingChanges.count).toBe(0)
    expect(pendingChanges.find('users', 1, 'name')).toBeUndefined()
  })

  it('re-staging the same cell replaces in place (no duplicates, same id, same position)', () => {
    const id1 = pendingChanges.stage('users', 1, 'name', 'Alice', 'Bob')
    pendingChanges.stage('users', 2, 'name', 'Carol', 'Dave')
    const id2 = pendingChanges.stage('users', 1, 'name', 'Alice', 'Eve')
    expect(id2).toBe(id1)
    expect(pendingChanges.count).toBe(2)
    expect(pendingChanges.changes[0].newValue).toBe('Eve')
    expect(pendingChanges.changes[0].oldValue).toBe('Alice') // original preserved
  })

  it('previewSql returns one statement per staged change in stable insertion order', () => {
    pendingChanges.stage('users', 1, 'name', 'A', 'X')
    pendingChanges.stage('orders', 7, 'status', 'open', 'closed')
    pendingChanges.stage('users', 2, 'name', 'B', 'Y')
    const sql = pendingChanges.previewSql()
    expect(sql).toHaveLength(3)
    expect(sql[0]).toBe("UPDATE users SET name = 'X' WHERE rid = 1;")
    expect(sql[1]).toBe("UPDATE orders SET status = 'closed' WHERE rid = 7;")
    expect(sql[2]).toBe("UPDATE users SET name = 'Y' WHERE rid = 2;")
  })

  it('buildUpdateSql escapes single quotes inside newValue', () => {
    const sql = buildUpdateSql({
      id: 'x', table: 'notes', row: 3, col: 'body', oldValue: '', newValue: "it's fine",
    })
    expect(sql).toBe("UPDATE notes SET body = 'it''s fine' WHERE rid = 3;")
  })

  it('commitAll on empty queue resolves to applied=0 without invoking the executor', async () => {
    let called = false
    pendingChanges.setExecutor(async () => {
      called = true
      return []
    })
    const r = await pendingChanges.commitAll()
    expect(r).toEqual({ applied: 0, failed: [] })
    expect(called).toBe(false)
  })

  it('commitAll success applies all changes and clears state', async () => {
    pendingChanges.setExecutor(async (changes) =>
      changes.map((c): CommitOutcome => ({ id: c.id, ok: true })),
    )
    pendingChanges.stage('users', 1, 'name', 'A', 'X')
    pendingChanges.stage('users', 2, 'name', 'B', 'Y')
    const r = await pendingChanges.commitAll()
    expect(r.applied).toBe(2)
    expect(r.failed).toHaveLength(0)
    expect(pendingChanges.count).toBe(0)
  })

  it('commitAll partial failure: removes applied, keeps failed with error attached', async () => {
    pendingChanges.setExecutor(async (changes) =>
      changes.map((c, i): CommitOutcome =>
        i === 1
          ? { id: c.id, ok: false, error: 'permission denied' }
          : { id: c.id, ok: true },
      ),
    )
    pendingChanges.stage('users', 1, 'name', 'A', 'X')
    pendingChanges.stage('users', 2, 'name', 'B', 'Y')
    pendingChanges.stage('users', 3, 'name', 'C', 'Z')
    const r = await pendingChanges.commitAll()
    expect(r.applied).toBe(2)
    expect(r.failed).toHaveLength(1)
    expect(r.failed[0].col).toBe('name')
    expect(r.failed[0].row).toBe(2)
    expect(r.failed[0].error).toBe('permission denied')
    // Only the failed change remains staged.
    expect(pendingChanges.count).toBe(1)
    expect(pendingChanges.changes[0].error).toBe('permission denied')
    expect(pendingChanges.changes[0].row).toBe(2)
  })

  it('commitAll all-failed keeps everything staged with errors', async () => {
    pendingChanges.setExecutor(async (changes) =>
      changes.map((c): CommitOutcome => ({ id: c.id, ok: false, error: 'boom' })),
    )
    pendingChanges.stage('users', 1, 'name', 'A', 'X')
    pendingChanges.stage('users', 2, 'name', 'B', 'Y')
    const r = await pendingChanges.commitAll()
    expect(r.applied).toBe(0)
    expect(r.failed).toHaveLength(2)
    expect(pendingChanges.count).toBe(2)
    expect(pendingChanges.changes.every((c) => c.error === 'boom')).toBe(true)
  })

  it('commitAll throws when no executor is configured', async () => {
    pendingChanges.stage('users', 1, 'name', 'A', 'X')
    await expect(pendingChanges.commitAll()).rejects.toThrow(/no commit executor/)
  })

  it('discardAll wipes the queue', () => {
    pendingChanges.stage('users', 1, 'name', 'A', 'X')
    pendingChanges.stage('users', 2, 'name', 'B', 'Y')
    pendingChanges.discardAll()
    expect(pendingChanges.count).toBe(0)
  })

  it('concurrent stage calls during commitAll preserve both committed-then-cleared and post-commit stages', async () => {
    // Snapshot semantics: only the changes present at commitAll() start
    // participate in the commit. New stages that land *during* the await
    // remain in the queue afterwards.
    pendingChanges.stage('users', 1, 'name', 'A', 'X')
    pendingChanges.stage('users', 2, 'name', 'B', 'Y')

    let resolveExec: () => void = () => {}
    pendingChanges.setExecutor(
      (changes) =>
        new Promise<CommitOutcome[]>((resolve) => {
          resolveExec = () =>
            resolve(changes.map((c) => ({ id: c.id, ok: true })))
        }),
    )

    const commitPromise = pendingChanges.commitAll()
    // Stage a third change while commit is in flight.
    pendingChanges.stage('users', 3, 'name', 'C', 'Z')
    resolveExec()
    const r = await commitPromise

    expect(r.applied).toBe(2)
    expect(pendingChanges.count).toBe(1)
    expect(pendingChanges.changes[0].row).toBe(3)
  })

  it('parallel stage() calls do not lose entries', () => {
    // No real concurrency in JS, but interleaved synchronous bursts are
    // the realistic stress case for the array-replacement pattern.
    const ids: string[] = []
    for (let i = 0; i < 16; i++) {
      ids.push(pendingChanges.stage('t', i, 'col', null, String(i)))
    }
    expect(pendingChanges.count).toBe(16)
    expect(new Set(ids).size).toBe(16) // all unique
    expect(pendingChanges.previewSql()).toHaveLength(16)
  })
})
