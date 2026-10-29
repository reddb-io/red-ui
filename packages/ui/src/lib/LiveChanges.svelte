<script lang="ts">
  import { Checkbox } from "@reddb-io/design-system/base"
  import { Button as DSButton } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  import { onDestroy } from 'svelte'
  import { CDCStreamClient, type ChangeEvent, type Subscription } from '#reddb'

  import Pause from '@lucide/svelte/icons/pause'
  import Play from '@lucide/svelte/icons/play'
  import Activity from '@lucide/svelte/icons/activity'
  import Filter from '@lucide/svelte/icons/filter'
  import X from '@lucide/svelte/icons/x'

  const workspace = useWorkspace()
  const { connection } = workspace

  interface Props {
    collection?: string
  }
  let { collection }: Props = $props()

  type Op = 'insert' | 'update' | 'delete'
  const OPS: Op[] = ['insert', 'update', 'delete']

  let events = $state<ChangeEvent[]>([])
  let paused = $state(false)
  let filter = $state<Record<Op, boolean>>({ insert: true, update: true, delete: true })
  let error = $state<string | null>(null)
  let subscription: Subscription | null = null
  let reader: ReadableStreamDefaultReader<ChangeEvent> | null = null
  const MAX = 500

  function startStream() {
    stopStream()
    error = null
    events = []
    const client = connection.client
    if (!client) {
      error = 'No active connection.'
      return
    }
    const cdc = new CDCStreamClient({
      client,
      // CDC is poll-only on reddb today: the server exposes `GET /changes`
      // (handlers_backup.rs / routing.rs) and there is NO `/changes/stream` SSE
      // route (verified against ../reddb 2026-06-01). Polling `GET /changes` is
      // therefore the optimal — and only — live-changes transport for every
      // Surface. The CDCStreamClient keeps full SSE plumbing dormant for a
      // hypothetical future server push endpoint; do NOT enable it until reddb
      // actually ships `/changes/stream`, or every subscription 404s. When it
      // lands this becomes:
      //   sseFactory: (url) => new EventSource(url),
      //   sseProbe: async () => (await fetch(url, { method: 'HEAD' })).ok,
      sseFactory: null,
    })
    subscription = cdc.subscribe({ collection })
    reader = subscription.events.getReader()
    void pump()
  }

  async function pump() {
    if (!reader) return
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) return
        if (paused) continue
        if (!value) continue
        events = [value, ...events].slice(0, MAX)
      }
    } catch (e) {
      error = (e as Error).message
    }
  }

  function stopStream() {
    if (reader) {
      try { reader.cancel() } catch {}
      reader = null
    }
    if (subscription) {
      subscription.close()
      subscription = null
    }
  }

  $effect(() => {
    // Restart whenever connection or collection changes.
    void connection.connected
    void collection
    if (connection.connected) startStream()
    else stopStream()
  })

  onDestroy(stopStream)

  function relative(ts: number): string {
    const diff = Date.now() - ts
    if (diff < 1000) return 'now'
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    return `${Math.floor(diff / 3_600_000)}h ago`
  }

  function absolute(ts: number): string {
    return new Date(ts).toISOString().replace('T', ' ').replace('Z', '')
  }

  const visible = $derived(events.filter((e) => filter[e.operation as Op] ?? true))
  const scope = $derived(collection ? `collection: ${collection}` : 'global')
</script>

<div class="h-full flex flex-col bg-background">
  <header class="px-3 py-2 border-b border-muted flex items-center gap-3 text-ink-muted">
    <DSIcon icon={Activity} color="current" class="" />
    <span class="type-label">Live changes</span>
    <span class="text-[11px] font-mono text-ink-muted">· {scope}</span>

    <div class="ml-auto flex items-center gap-1">
      <DSButton variant="ghost" size="sm"
        type="button"

        onclick={() => (paused = !paused)}
        title={paused ? 'Resume stream' : 'Pause stream'}
      >
        {#if paused}
          <DSIcon icon={Play} color="current" class="" /> resume
        {:else}
          <DSIcon icon={Pause} color="current" class="" /> pause
        {/if}
      </DSButton>

      <div class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-muted text-ink-muted">
        <DSIcon icon={Filter} color="current" class="" />
        {#each OPS as op (op)}
          <Checkbox label={op} checked={filter[op]} oncheckedchange={checked => filter = {...filter, [op]: checked}} />
        {/each}
      </div>

      {#if events.length > 0}
        <DSButton variant="ghost" size="sm"
          type="button"

          onclick={() => (events = [])}
          title="Clear buffer"
        >
          <DSIcon icon={X} color="current" class="" /> clear
        </DSButton>
      {/if}
    </div>
  </header>

  <div class="flex-1 overflow-auto">
    {#if error}
      <div class="p-6 text-[12px] font-mono text-ink-muted">
        <span class="text-primary-text">error:</span> {error}
      </div>
    {:else if !connection.connected}
      <div class="p-6 text-[12px] font-mono text-ink-muted">
        Not connected. Use the topbar Connect button to open a stream.
      </div>
    {:else if visible.length === 0}
      <div class="p-6 text-[12px] font-mono text-ink-muted">
        {paused ? 'Paused — no events captured.' : 'Listening for changes…'}
      </div>
    {:else}
      <ul class="divide-y divide-line-1 font-mono text-[12px]">
        {#each visible as e (e.lsn)}
          <li class="px-3 py-1.5 flex items-center gap-3 hover:bg-elevation-base-surface">
            <span class="text-ink-muted w-16 shrink-0" title={absolute(e.timestamp)}>
              {relative(e.timestamp)}
            </span>
            <span class="text-ink-muted w-16 shrink-0">lsn {e.lsn}</span>
            <span
              class={[
                'inline-block w-14 text-center text-[10px] uppercase rounded px-1 py-0.5 shrink-0 border',
                e.operation === 'insert' && 'border-ok/40 text-feedback-success-foreground',
                e.operation === 'update' && 'border-feedback-warning-border/40 text-feedback-warning-foreground',
                e.operation === 'delete' && 'border-primary/40 text-primary-text',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {e.operation}
            </span>
            <span class="text-ink-muted truncate">{e.collection}</span>
            <span class="text-ink-muted">·</span>
            <span class="text-ink-muted truncate">{e.kind}</span>
            {#if e.rid !== undefined}
              <span class="text-ink-muted ml-auto">rid {e.rid}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
