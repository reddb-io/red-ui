<script lang="ts">
  import { onDestroy } from 'svelte'
  import { CDCStreamClient, type ChangeEvent, type Subscription } from '#reddb'
  import { connection } from '$lib/connections.svelte'
  import { Pause, Play, Activity, Filter, X } from 'lucide-svelte'

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
      // No EventSource probe wired yet; reddb's SSE endpoint is in flight, so
      // force REST polling. When the server ships SSE this becomes:
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

<div class="h-full flex flex-col bg-bg-0">
  <header class="px-3 py-2 border-b border-line-1 flex items-center gap-3 text-fg-3">
    <Activity class="size-3.5" />
    <span class="type-label">Live changes</span>
    <span class="text-[11px] font-mono text-fg-3">· {scope}</span>

    <div class="ml-auto flex items-center gap-1">
      <button
        type="button"
        class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-line-1 hover:bg-bg-2 text-fg-2"
        onclick={() => (paused = !paused)}
        title={paused ? 'Resume stream' : 'Pause stream'}
      >
        {#if paused}
          <Play class="size-3" /> resume
        {:else}
          <Pause class="size-3" /> pause
        {/if}
      </button>

      <div class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-line-1 text-fg-3">
        <Filter class="size-3" />
        {#each OPS as op (op)}
          <label class="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={filter[op]}
              onchange={(ev) => (filter = { ...filter, [op]: (ev.currentTarget as HTMLInputElement).checked })}
              class="accent-accent size-3"
            />
            <span class={filter[op] ? 'text-fg-1' : 'text-fg-3'}>{op}</span>
          </label>
        {/each}
      </div>

      {#if events.length > 0}
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-line-1 hover:bg-bg-2 text-fg-3"
          onclick={() => (events = [])}
          title="Clear buffer"
        >
          <X class="size-3" /> clear
        </button>
      {/if}
    </div>
  </header>

  <div class="flex-1 overflow-auto">
    {#if error}
      <div class="p-6 text-[12px] font-mono text-fg-3">
        <span class="text-accent">error:</span> {error}
      </div>
    {:else if !connection.connected}
      <div class="p-6 text-[12px] font-mono text-fg-3">
        Not connected. Use the topbar Connect button to open a stream.
      </div>
    {:else if visible.length === 0}
      <div class="p-6 text-[12px] font-mono text-fg-3">
        {paused ? 'Paused — no events captured.' : 'Listening for changes…'}
      </div>
    {:else}
      <ul class="divide-y divide-line-1 font-mono text-[12px]">
        {#each visible as e (e.lsn)}
          <li class="px-3 py-1.5 flex items-center gap-3 hover:bg-bg-1">
            <span class="text-fg-3 w-16 shrink-0" title={absolute(e.timestamp)}>
              {relative(e.timestamp)}
            </span>
            <span class="text-fg-3 w-16 shrink-0">lsn {e.lsn}</span>
            <span
              class={[
                'inline-block w-14 text-center text-[10px] uppercase rounded px-1 py-0.5 shrink-0 border',
                e.operation === 'insert' && 'border-ok/40 text-ok',
                e.operation === 'update' && 'border-warn/40 text-warn',
                e.operation === 'delete' && 'border-accent/40 text-accent',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {e.operation}
            </span>
            <span class="text-fg-2 truncate">{e.collection}</span>
            <span class="text-fg-3">·</span>
            <span class="text-fg-3 truncate">{e.kind}</span>
            {#if e.rid !== undefined}
              <span class="text-fg-3 ml-auto">rid {e.rid}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
