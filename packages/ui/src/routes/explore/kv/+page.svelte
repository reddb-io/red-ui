<script lang="ts">
  import { Badge, Card } from '@red-ui/ui-kit'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { connection } from '$lib/connections.svelte'
  import type { ChangeEvent } from '@red-ui/protocol'
  import { Activity, KeyRound } from 'lucide-svelte'

  let events = $state<ChangeEvent[]>([])
  let error = $state<string | null>(null)
  let loading = $state(false)

  $effect(() => {
    if (!connection.probe.reachable) {
      events = []
      return
    }
    const client = connection.client!
    loading = true
    client.changes().then((e) => {
      events = e.slice().reverse() // newest first
      loading = false
    }).catch((err) => { error = err.message; loading = false })
  })

  const opTone: Record<string, 'ok' | 'info' | 'danger' | 'warn'> = {
    insert: 'ok',
    update: 'info',
    delete: 'danger',
  }

  function fmtTime(ms: number) {
    return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  function fmtRel(ms: number) {
    const d = Date.now() - ms
    if (d < 1000) return 'now'
    if (d < 60_000) return `${Math.round(d / 1000)}s ago`
    if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`
    return `${Math.round(d / 3_600_000)}h ago`
  }
</script>

{#if !connection.probe.reachable}
  <PageHeader eyebrow="Explore" title="KV · Changes" />
  <EmptyState
    icon={KeyRound}
    title="No connection"
    message="Connect to a reddb instance to browse the change feed."
  />
{:else}
  <PageHeader
    eyebrow="Explore"
    title="Change feed"
    subtitle="Live CDC stream from {connection.active.label} via /changes — every insert/update/delete with its LSN."
  >
    <Badge tone="ok">live</Badge>
    <Badge tone="neutral">{events.length} events</Badge>
  </PageHeader>

  {#if error}
    <Card><p class="text-danger text-[12px] font-mono m-0">⚠ {error}</p></Card>
  {:else if loading && events.length === 0}
    <Card><p class="text-fg-2 text-[12px] font-mono m-0">Loading change feed…</p></Card>
  {:else if events.length === 0}
    <EmptyState
      icon={Activity}
      title="No changes yet"
      message="The change feed is empty. Insert a row via the Tables view or run the seed to populate."
      hint="./scripts/seed.sh {connection.active.url}"
    />
  {:else}
    <Card title="changes · most recent first">
      <div class="grid gap-px bg-line-1">
        <div class="grid grid-cols-[60px_70px_90px_1fr_60px_120px] gap-3 px-3 py-2 bg-bg-1 type-label">
          <span>lsn</span>
          <span>op</span>
          <span>kind</span>
          <span>collection</span>
          <span class="text-right">rid</span>
          <span class="text-right">time</span>
        </div>
        {#each events as ev}
          <div class="grid grid-cols-[60px_70px_90px_1fr_60px_120px] gap-3 px-3 py-2 bg-bg-1 hover:bg-bg-2 font-mono text-[12px] items-center">
            <code class="text-fg-3">{ev.lsn}</code>
            <Badge tone={opTone[ev.operation] ?? 'neutral'}>{ev.operation}</Badge>
            <code class="text-fg-2">{ev.kind}</code>
            <code class="text-fg-0">{ev.collection}</code>
            <code class="text-fg-3 text-right">{ev.rid ?? '—'}</code>
            <span class="text-fg-3 text-right" title={fmtTime(ev.timestamp)}>{fmtRel(ev.timestamp)}</span>
          </div>
        {/each}
      </div>
    </Card>
  {/if}
{/if}
