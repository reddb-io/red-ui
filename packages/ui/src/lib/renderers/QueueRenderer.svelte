<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { connection } from '$lib/connections.svelte'
  import { activity } from '$lib/activity.svelte'
  import { Braces, ClipboardList, Loader2, Plus, Radio, Search, Send, X } from 'lucide-svelte'
  import {
    extractQueueEvents,
    extractQueueMessages,
    queueCommandPlan,
    queuePushQuery,
    queueSummary,
    type QueueMessage,
  } from './queue-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  let mode = $state<'events' | 'messages' | 'commands' | 'json'>('events')
  let filter = $state('')
  let selected = $state<QueueMessage | null>(null)
  let composerOpen = $state(false)
  let payload = $state('')
  let inserting = $state(false)
  let insertError = $state<string | null>(null)
  let inserted = $state(0)
  const payloadPlaceholder = '{"type":"email","to":"ops@example.com"}'

  const messages = $derived(extractQueueMessages(result))
  const summary = $derived(queueSummary(messages))
  const events = $derived(extractQueueEvents(messages))
  const commands = $derived(collection ? queueCommandPlan(collection) : [])
  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((msg) =>
      msg.id.toLowerCase().includes(q) ||
      msg.state.toLowerCase().includes(q) ||
      JSON.stringify(msg.message).toLowerCase().includes(q),
    )
  })

  function display(v: unknown): string {
    if (typeof v === 'string') return v
    return JSON.stringify(v)
  }

  function fmtTs(v: number | null): string {
    if (v === null) return '-'
    try {
      return new Date(v).toISOString().replace('T', ' ').slice(0, 19)
    } catch {
      return String(v)
    }
  }

  function parsePayload(): unknown {
    const text = payload.trim()
    if (!text) return ''
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  async function insertMessage() {
    const client = connection.client
    if (!client || !collection || !payload.trim()) return
    inserting = true
    insertError = null
    try {
      await activity.track(`${collection} · enqueue message`, () =>
        client.query(queuePushQuery(collection, parsePayload())),
      )
      payload = ''
      inserted += 1
    } catch (e) {
      insertError = (e as Error).message
    } finally {
      inserting = false
    }
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
    <div class="inline-flex border border-line-2 rounded overflow-hidden">
      <button
        type="button"
        class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors', mode === 'events' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
        onclick={() => (mode = 'events')}
        aria-pressed={mode === 'events'}
      >
        <Radio class="size-3" />
        events
      </button>
      <button
        type="button"
        class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'messages' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
        onclick={() => (mode = 'messages')}
        aria-pressed={mode === 'messages'}
      >
        <Send class="size-3" />
        messages
      </button>
      <button
        type="button"
        class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'commands' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
        onclick={() => (mode = 'commands')}
        aria-pressed={mode === 'commands'}
      >
        <ClipboardList class="size-3" />
        commands
      </button>
      <button
        type="button"
        class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'json' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
        onclick={() => (mode = 'json')}
        aria-pressed={mode === 'json'}
      >
        <Braces class="size-3" />
        json
      </button>
    </div>

    <button
      type="button"
      onclick={() => (composerOpen = !composerOpen)}
      disabled={!collection}
      class={['inline-flex items-center gap-1 h-6 px-2 rounded border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed', composerOpen ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2'].join(' ')}
      aria-pressed={composerOpen}
      title={collection ? 'Insert a queue message' : 'Open this as a collection to insert messages'}
    >
      <Plus class="size-3" />
      insert
    </button>

    <div class="inline-flex items-center gap-1.5 border border-line-1 rounded px-2 py-1 bg-bg-0">
      <Search class="size-3 text-fg-3" />
      <input type="text" bind:value={filter} placeholder="message/state…" class="bg-transparent text-fg-1 outline-none w-[180px] placeholder:text-fg-3" />
      {#if filter}
        <button type="button" onclick={() => (filter = '')} class="text-fg-3 hover:text-fg-1 cursor-pointer" aria-label="Clear queue filter">
          <X class="size-3" />
        </button>
      {/if}
    </div>

    <div class="ml-auto flex items-center gap-3 text-fg-3">
      <span>{filtered.length.toLocaleString()} messages</span>
      {#if events.length}<span>{events.length.toLocaleString()} events</span>{/if}
      <span>{summary.activeConsumers} active consumers</span>
      {#if summary.sources.length}<span>from <span class="text-fg-2">{summary.sources.join(', ')}</span></span>{/if}
      {#if summary.dlcs.length}<span>dlc <span class="text-fg-2">{summary.dlcs.join(', ')}</span></span>{/if}
      {#if collection}<span class="text-fg-2">{collection}</span>{/if}
    </div>
  </div>

  {#if composerOpen}
    <div class="border-b border-line-1 bg-bg-1/20 px-3 py-2 text-[11px] font-mono">
      <div class="flex gap-2">
        <textarea
          bind:value={payload}
          rows="3"
          placeholder={payloadPlaceholder}
          class="flex-1 resize-none rounded border border-line-1 bg-bg-0 px-2 py-1 text-[12px] text-fg-1 outline-none placeholder:text-fg-3 focus:border-accent"
        ></textarea>
        <button
          type="button"
          onclick={insertMessage}
          disabled={inserting || !payload.trim() || !collection}
          class="inline-flex h-7 items-center gap-1.5 rounded bg-accent px-3 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {#if inserting}<Loader2 class="size-3 animate-spin" />{:else}<Send class="size-3" />{/if}
          insert
        </button>
      </div>
      {#if insertError}
        <div class="mt-1.5 text-warn">{insertError}</div>
      {:else if inserted > 0}
        <div class="mt-1.5 text-ok">{inserted} inserted. Refresh the collection to reload from reddb.</div>
      {/if}
    </div>
  {/if}

  {#if mode === 'events'}
    <div class="flex-1 min-h-0 overflow-auto">
      {#if events.length === 0}
        <div class="p-3 text-[12px] font-mono text-fg-3">No WITH EVENTS envelopes detected in this queue result.</div>
      {:else}
        <table class="w-full border-collapse text-[12px] font-mono">
          <thead class="sticky top-0 bg-bg-1 z-10">
            <tr class="border-b border-line-1 text-fg-3">
              <th class="px-2 py-1.5 text-left font-normal">time</th>
              <th class="px-2 py-1.5 text-left font-normal">source</th>
              <th class="px-2 py-1.5 text-left font-normal">op</th>
              <th class="px-2 py-1.5 text-left font-normal">entity</th>
              <th class="px-2 py-1.5 text-right font-normal">lsn</th>
              <th class="px-2 py-1.5 text-left font-normal">after</th>
            </tr>
          </thead>
          <tbody>
            {#each events as event (`${event.messageId}-${event.lsn ?? event.entityId}`)}
              <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
                <td class="px-2 py-1 text-fg-2">{fmtTs(event.ts)}</td>
                <td class="px-2 py-1 text-fg-0">{event.collection}</td>
                <td class="px-2 py-1"><span class="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-accent">{event.op}</span></td>
                <td class="px-2 py-1 text-fg-1">{event.entityId}</td>
                <td class="px-2 py-1 text-right text-fg-3">{event.lsn ?? '-'}</td>
                <td class="px-2 py-1 text-fg-2 truncate max-w-[520px]">{display(event.after)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {:else if mode === 'commands'}
    <div class="flex-1 min-h-0 overflow-auto p-3 text-[12px] font-mono">
      <div class="grid gap-2">
        {#each commands as command (command.query)}
          <div class="rounded border border-line-1 bg-bg-1 px-3 py-2">
            <div class="mb-1 flex items-center gap-2">
              <span class="text-fg-0">{command.label}</span>
              <span class={['rounded border px-1.5 py-0.5 text-[10px]', command.mutates ? 'border-warn/30 bg-warn/10 text-warn' : 'border-ok/30 bg-ok/10 text-ok'].join(' ')}>
                {command.mutates ? 'mutates' : 'read-only'}
              </span>
            </div>
            <pre class="m-0 overflow-x-auto rounded bg-bg-0 px-2 py-1 text-fg-1">{command.query}</pre>
            <div class="mt-1 text-fg-3">{command.note}</div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex-1 min-h-0 grid grid-cols-[minmax(360px,0.9fr)_1.1fr]">
      <div class="overflow-auto border-r border-line-1 text-[12px] font-mono">
        {#if filtered.length === 0}
          <div class="p-3 text-fg-3">No queue messages in this result.</div>
        {:else}
          {#each filtered as msg (msg.id)}
            <button
              type="button"
              onclick={() => (selected = msg)}
              class={['w-full text-left px-3 py-2 border-b border-line-1/60 hover:bg-bg-1/50 cursor-pointer', selected === msg ? 'bg-bg-1 text-fg-0' : 'text-fg-2'].join(' ')}
            >
              <div class="flex items-center gap-2">
                <span class="text-accent">{msg.id}</span>
                <span class="rounded border border-line-1 px-1 py-0.5 text-[10px] text-fg-3">{msg.state}</span>
                {#if msg.consumer}<span class="ml-auto text-fg-3">{msg.consumer}</span>{/if}
              </div>
              <div class="mt-1 truncate text-fg-1">{display(msg.message)}</div>
            </button>
          {/each}
        {/if}
      </div>

      <div class="overflow-auto p-3 text-[12px] font-mono">
        {#if mode === 'json'}
          <pre class="whitespace-pre-wrap text-fg-1">{JSON.stringify(filtered.map((m) => m.values), null, 2)}</pre>
        {:else if selected}
          <div class="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
            <span class="text-fg-3">id</span><span class="text-fg-0">{selected.id}</span>
            <span class="text-fg-3">state</span><span class="text-fg-0">{selected.state}</span>
            <span class="text-fg-3">consumer</span><span class="text-fg-0">{selected.consumer ?? 'none'}</span>
            <span class="text-fg-3">dlc</span><span class="text-fg-0">{selected.dlc ?? 'none'}</span>
            <span class="text-fg-3">message</span><pre class="m-0 whitespace-pre-wrap text-fg-1">{display(selected.message)}</pre>
          </div>
        {:else}
          <div class="text-fg-3">Select a message to inspect payload, delivery state, consumer, and DLC link.</div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="border-t border-line-1 px-3 py-1.5 text-[10px] font-mono text-fg-3 flex items-center gap-3">
    {#each summary.states as [state, count] (state)}
      <span><span class="text-fg-2">{state}</span> {count.toLocaleString()}</span>
    {/each}
    {#each summary.operations as [op, count] (op)}
      <span><span class="text-fg-2">{op}</span> {count.toLocaleString()}</span>
    {/each}
  </div>
</div>
