<script lang="ts">
  // The connection's state, inline in the top bar. It has no bar of its own: the
  // connection menu beside it already names the server and its round trip, so
  // this adds only what that menu does not say. A healthy state stays quiet:
  // "saved" is announced to assistive technology and takes no room on screen.
  import { Badge, Button } from '@reddb-io/design-system/base'
  import { useRouter } from './router.svelte'
  import { useWorkspace } from './workspace-context'

  const workspace = useWorkspace()
  const { connection, pendingChanges } = workspace
  const router = useRouter()
  const role = $derived(connection.probe.replication?.role ?? connection.active?.role ?? 'standalone')
  const wal = $derived(connection.probe.replication?.wal_lsn ?? connection.probe.replication?.last_applied_lsn)
  const lag = $derived.by(() => {
    const replication = connection.probe.replication
    if (role !== 'replica' || replication?.last_seen_primary_lsn === undefined || replication.last_applied_lsn === undefined) return undefined
    return Math.max(0, replication.last_seen_primary_lsn - replication.last_applied_lsn)
  })
  const persistence = $derived(workspace.persistenceStatus.state)
  const persistenceLabel = $derived(
    persistence === 'saved' ? 'Saved on this device' : persistence === 'error' ? 'Workspace not saved' : persistence === 'loading' ? 'Opening local workspace…' : 'Saving workspace…',
  )
</script>

<div aria-label="Connection status" role="status" data-workspace-status data-workspace-persistence={persistence}
  class="flex min-w-0 flex-wrap items-center gap-[var(--reddb-spatial-gap-sm)] text-caption text-ink-muted">
  {#if connection.connected}
    <!-- The role is a shortcut to the cluster overview; on a phone the dock already has it. -->
    <Button variant="ghost" size="sm" class="hidden sm:inline-flex" onclick={() => router.go({ view: 'cluster' })} title="Open cluster overview">{role}</Button>
    {#if lag !== undefined}<Badge tone={lag > 0 ? 'warning' : 'neutral'}>lag {lag}</Badge>{/if}
    {#if wal !== undefined}<Badge>lsn {wal}</Badge>{/if}
    {#if connection.readOnly}<Badge tone="warning" title={connection.readOnlyReason ?? 'The server is open read-only; mutations are disabled.'}>Read-only</Badge>{/if}
  {/if}
  {#if persistence !== 'legacy'}
    <span class={persistence === 'saved' ? 'sr-only' : persistence === 'error' ? 'text-feedback-danger-foreground' : undefined}
      title={workspace.persistenceStatus.error ?? 'Workspace documents on this device'}>{persistenceLabel}</span>
    {#if persistence === 'error'}<Button variant="ghost" size="sm" onclick={() => { void workspace.flushPersistence().catch(() => {}) }}>Retry saving</Button>{/if}
  {/if}
  {#if pendingChanges.count > 0}<Button variant="ghost" size="sm" aria-label={`Pending changes (${pendingChanges.count})`} onclick={() => workspace.dispatch('red:open-pending-changes')}>Pending changes ({pendingChanges.count})</Button>{/if}
</div>
