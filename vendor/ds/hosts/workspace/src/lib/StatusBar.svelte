<script lang="ts">
  import { Badge, Button, LoadingIndicator, StatusIndicator } from '@reddb-io/design-system/base'
  import { useRouter } from './router.svelte'
  import { useWorkspace } from './workspace-context'
  import { readBuildInfo } from './build-info'

  const workspace = useWorkspace()
  const { connection, pendingChanges } = workspace
  const router = useRouter()
  const build = readBuildInfo()
  const role = $derived(connection.probe.replication?.role ?? connection.active?.role ?? 'standalone')
  const wal = $derived(connection.probe.replication?.wal_lsn ?? connection.probe.replication?.last_applied_lsn)
  const lag = $derived.by(() => {
    const replication = connection.probe.replication
    if (role !== 'replica' || replication?.last_seen_primary_lsn === undefined || replication.last_applied_lsn === undefined) return undefined
    return Math.max(0, replication.last_seen_primary_lsn - replication.last_applied_lsn)
  })
</script>

<div aria-label="Connection status" role="status" class="flex flex-wrap items-center gap-[var(--reddb-spatial-gap-sm)] border-b border-elevation-base-border bg-elevation-sunken-surface px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)] text-sm text-foreground">
  {#if connection.connecting}
    <LoadingIndicator size="sm" label="Connecting…" />
  {:else}
    <Button variant="ghost" size="sm" onclick={() => router.go({ view: 'cluster' })} title="Open cluster overview">
      <StatusIndicator label={connection.connected ? role : 'Not connected'} tone={connection.connected ? 'success' : 'neutral'} />
      {#if connection.connected}<span class="max-w-full truncate">{connection.active.label}</span>{/if}
    </Button>
  {/if}
  {#if connection.connected}
    {#if connection.probe.rtt_ms !== undefined}<Badge>rtt {connection.probe.rtt_ms}ms</Badge>{/if}
    {#if lag !== undefined}<Badge tone={lag > 0 ? 'warning' : 'neutral'}>lag {lag}</Badge>{/if}
    {#if wal !== undefined}<Badge>lsn {wal}</Badge>{/if}
    {#if connection.readOnly}<Badge tone="warning" title={connection.readOnlyReason ?? 'The server is open read-only; mutations are disabled.'}>Read-only</Badge>{/if}
  {/if}
  {#if workspace.persistenceStatus.state !== 'legacy'}
    <span title={workspace.persistenceStatus.error ?? 'Workspace documents on this device'}>
      {workspace.persistenceStatus.state === 'saved' ? 'Saved on this device' : workspace.persistenceStatus.state === 'error' ? 'Workspace not saved' : workspace.persistenceStatus.state === 'loading' ? 'Opening local workspace…' : 'Saving workspace…'}
    </span>
    {#if workspace.persistenceStatus.state === 'error'}<Button variant="ghost" size="sm" onclick={() => { void workspace.flushPersistence().catch(() => {}) }}>Retry saving</Button>{/if}
  {/if}
  <div class="ms-auto flex flex-wrap items-center gap-[var(--reddb-spatial-gap-sm)]">
    {#if pendingChanges.count > 0}<Button variant="ghost" size="sm" aria-label={`Pending changes (${pendingChanges.count})`} onclick={() => workspace.dispatch('red:open-pending-changes')}>Pending changes ({pendingChanges.count})</Button>{/if}
    {#if !connection.connected && !connection.connecting}<Button size="sm" onclick={() => workspace.dispatch('red:open-connect')}>Connect</Button>{/if}
    <Badge title={`red-ui ${build.version} · ${build.gitSha} · built ${build.buildTime}`}>v{build.version}</Badge>
  </div>
</div>
