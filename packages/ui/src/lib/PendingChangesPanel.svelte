<script lang="ts">
  import { useWorkspace } from './workspace-context'
  import { buildUpdateSql } from './pending-changes.svelte'

  import { Alert, Button, Dialog } from '@reddb-io/design-system/base'
  import { ChangeReview } from '@reddb-io/design-system/app'

  const workspace = useWorkspace()
  const { connection, pendingChanges } = workspace

  // Mutations are committed against the server; block them while it reports
  // read-only (#23). The reason explains *why* the control is disabled.
  const readOnly = $derived(connection.readOnly)
  const readOnlyReason = $derived(connection.readOnlyReason)

  interface Props {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  let committing = $state(false)
  let lastError = $state<string | null>(null)

  async function apply() {
    if (committing || readOnly) return
    committing = true
    lastError = null
    try {
      const r = await pendingChanges.commitAll()
      if (r.failed.length === 0) {
        onClose()
      }
      // On partial failure the panel stays open so the user can see the
      // failures inline. We don't auto-close.
    } catch (e) {
      lastError = (e as Error).message
    } finally {
      committing = false
    }
  }

  function discard(ids: readonly string[]) {
    if (committing) return
    for (const id of ids) pendingChanges.unstage(id)
    if (pendingChanges.count === 0) onClose()
  }
</script>

<Dialog title="Pending changes" {open} onopenchange={next => { if (!next) onClose() }}
  dismissible={!committing} showClose={!committing} size="lg" initialFocus="actions"
  onkeydown={(event: KeyboardEvent) => { if (committing && event.key === 'Escape') { event.preventDefault(); event.stopPropagation() } }}>
  <ChangeReview title={`${pendingChanges.count} staged · review before applying`} headingLevel={3}
    items={pendingChanges.changes.map(change => ({
      id: change.id,
      label: `${change.table} · rid ${change.row} · ${change.col}`,
      before: String(change.oldValue ?? 'NULL'), after: change.newValue,
      description: buildUpdateSql(change),
      state: change.error ? 'failed' as const : 'pending' as const,
      error: change.error,
    }))}
    applying={committing}
    blockedReason={readOnly ? (readOnlyReason ?? 'Server is read-only — changes cannot be applied.') : undefined}
    onapplyrequest={apply} ondiscardrequest={discard}
    applyLabel={committing ? 'Applying…' : 'Apply all'} discardLabel="Discard all"
    discardItemLabel="Unstage" emptyLabel="No staged changes." beforeLabel="old" afterLabel="new" />
  {#if lastError}<Alert title={lastError} tone="danger" />{/if}
  {#snippet actions()}
    <Button disabled={committing} onclick={onClose}>Cancel</Button>
  {/snippet}
</Dialog>
