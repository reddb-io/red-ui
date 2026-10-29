<script lang="ts">
  import { Button, EmptyState, Popover, StatusIndicator } from '@reddb-io/design-system/base'
  import { ActivityFeed } from '@reddb-io/design-system/app'
  import { useWorkspace } from './workspace-context'
  const { activity } = useWorkspace()
  let open = $state(false)
  const status = $derived(activity.inflight > 0 ? `${activity.inflight} active requests` : 'idle')
  const items = $derived(activity.log.map(entry => ({
    id: String(entry.id), title: entry.label,
    datetime: new Date(entry.startedAt).toISOString(),
    time: entry.durationMs === null ? 'In progress' : entry.durationMs < 1000 ? `${entry.durationMs}ms` : `${(entry.durationMs / 1000).toFixed(1)}s`,
    description: entry.status === 'error' ? `Failed: ${entry.error ?? 'Request failed'}` : entry.status === 'pending' ? 'Request running' : 'Completed',
  })))
</script>

<Popover bind:open contentLabel="Activity log" size="sm" align="end" triggerLabel={`${status}, reddb activity`}>
  {#snippet trigger()}<StatusIndicator label={status} tone={activity.inflight > 0 ? 'info' : 'neutral'} />{/snippet}
  {#if activity.inflight > 0}<Button variant="ghost" size="sm" onclick={() => activity.reset()} title="Force-clear the in-flight counter when a request hangs">Reset active requests</Button>{/if}
  {#if items.length}<ActivityFeed {items} label="Recent RedDB requests" />{:else}<EmptyState title="No activity yet" bordered={false} />{/if}
</Popover>
