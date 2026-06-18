<script lang="ts">
  // Eixo 4 — the ASK chat. Starts as a centred full-screen conversation;
  // the moment an answer arrives grounded on sources, it splits into two
  // columns: the conversation (squeezed left) and the visualization of what
  // the answer was grounded on (right). Citation chips in the answer link a
  // claim to the exact source that supports it — "the logic it took".
  import { Badge } from '@reddb-io/ui-kit'
  import EmptyState from '$lib/EmptyState.svelte'
  import { activity } from '$lib/activity.svelte'
  import { connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import { parseAnswerSegments, parseUrn, type AskResponse } from '#reddb'
  import { Sparkles, Lock, CornerDownLeft, AlertTriangle } from 'lucide-svelte'

  interface ChatMessage {
    id: number
    role: 'user' | 'assistant'
    text: string
    response?: AskResponse
    error?: string
    pending?: boolean
  }

  let messages = $state<ChatMessage[]>([])
  let input = $state('')
  let sending = $state(false)
  let activeArtifact = $state<number | null>(null)
  let highlightMarker = $state<number | null>(null)
  let nextId = 0

  const connected = $derived(connection.connected)
  const locked = $derived(secureStore.locked)
  const canSend = $derived(connected && !locked && !sending && input.trim().length > 0)

  // Split as soon as any answer carries grounding sources.
  const splitOpen = $derived(
    messages.some((m) => m.role === 'assistant' && (m.response?.sources_flat?.length ?? 0) > 0),
  )
  const artifactMessage = $derived(
    activeArtifact !== null
      ? messages[activeArtifact]
      : [...messages].reverse().find((m) => (m.response?.sources_flat?.length ?? 0) > 0),
  )

  const SUGGESTIONS = [
    'What changed in the last hour?',
    'Which collections hold the most rows?',
    'Summarize the most recent errors.',
  ]

  async function send() {
    const question = input.trim()
    const client = connection.client
    if (!question || !client || sending) return
    input = ''
    const userMsg: ChatMessage = { id: nextId++, role: 'user', text: question }
    const assistantMsg: ChatMessage = { id: nextId++, role: 'assistant', text: '', pending: true }
    messages = [...messages, userMsg, assistantMsg]
    sending = true
    try {
      const response = await activity.track('ask', () => client.ask(question))
      const idx = messages.findIndex((m) => m.id === assistantMsg.id)
      if (idx !== -1) {
        messages[idx] = { ...assistantMsg, pending: false, text: response.answer, response }
        if ((response.sources_flat?.length ?? 0) > 0) activeArtifact = idx
      }
    } catch (e) {
      const idx = messages.findIndex((m) => m.id === assistantMsg.id)
      if (idx !== -1) {
        messages[idx] = { ...assistantMsg, pending: false, error: (e as Error).message }
      }
    } finally {
      sending = false
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) void send()
    }
  }

  function focusSource(messageIndex: number, marker: number) {
    activeArtifact = messageIndex
    highlightMarker = marker
  }

  /** Pretty-print JSON content, else return the raw string. */
  function formatContent(content: string): string {
    try {
      return JSON.stringify(JSON.parse(content), null, 2)
    } catch {
      return content
    }
  }

  function fmtCost(usd: number | undefined): string {
    if (usd === undefined) return ''
    return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
  }

  const SOURCE_TONE: Record<string, 'info' | 'ok' | 'accent' | 'warn' | 'neutral'> = {
    table: 'info',
    document: 'ok',
    vector: 'accent',
    graph_node: 'warn',
    graph_edge: 'warn',
    kv: 'neutral',
  }
</script>

{#snippet conversation(squeezed: boolean)}
  <div class="flex h-full flex-col">
    <div class="flex-1 overflow-auto">
      <div class={['mx-auto flex flex-col gap-4 p-4', squeezed ? 'max-w-none' : 'max-w-2xl'].join(' ')}>
        {#if messages.length === 0}
          <div class="flex flex-col items-center gap-4 py-16 text-center">
            <div class="flex size-12 items-center justify-center rounded-full border border-line-2 bg-bg-1">
              <Sparkles class="size-5 text-accent" />
            </div>
            <div>
              <div class="font-mono text-[15px] text-fg-0">Ask your database</div>
              <div class="mt-1 text-[12px] text-fg-3">Grounded answers with citations to the rows, docs, and vectors behind them.</div>
            </div>
            <div class="flex flex-wrap justify-center gap-1.5">
              {#each SUGGESTIONS as s}
                <button
                  type="button"
                  onclick={() => { input = s; if (canSend) void send() }}
                  disabled={!connected || locked}
                  class="rounded-full border border-line-2 bg-bg-1 px-3 py-1.5 text-[11px] text-fg-2 hover:border-line-3 hover:text-fg-0 disabled:cursor-not-allowed disabled:opacity-40"
                >{s}</button>
              {/each}
            </div>
          </div>
        {/if}

        {#each messages as m, i (m.id)}
          {#if m.role === 'user'}
            <div class="flex justify-end">
              <div class="max-w-[85%] rounded-lg rounded-br-sm border border-line-2 bg-bg-2 px-3 py-2 font-mono text-[12px] text-fg-0">{m.text}</div>
            </div>
          {:else}
            <div class="flex flex-col gap-1.5">
              {#if m.pending}
                <div class="flex items-center gap-2 text-[12px] text-fg-3"><Sparkles class="size-3.5 animate-pulse text-accent" /> thinking…</div>
              {:else if m.error}
                <div class="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-[12px] text-fg-1">
                  <AlertTriangle class="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span>{m.error.includes('404') || m.error.includes('route not found') ? 'This reddb has no AI endpoint (/ai/ask). Configure a provider to enable Ask.' : m.error}</span>
                </div>
              {:else if m.response}
                <div class="text-[13px] leading-relaxed text-fg-1">
                  {#each parseAnswerSegments(m.response.answer) as seg}
                    {#if seg.type === 'text'}{seg.value}{:else}<button
                      type="button"
                      onclick={() => focusSource(i, seg.marker)}
                      title="Jump to source {seg.marker}"
                      class="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-accent/15 px-1 align-super text-[9px] font-semibold text-accent hover:bg-accent/25"
                    >{seg.marker}</button>{/if}
                  {/each}
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-fg-3">
                  {#if m.response.validation && !m.response.validation.ok}
                    <Badge tone="warn">unverified citations</Badge>
                  {/if}
                  {#if m.response.sources_flat?.length}
                    <button type="button" class="rounded border border-line-1 px-1.5 py-0.5 hover:border-line-3 hover:text-fg-1" onclick={() => { activeArtifact = i; highlightMarker = null }}>
                      {m.response.sources_flat.length} source{m.response.sources_flat.length === 1 ? '' : 's'}
                    </button>
                  {/if}
                  {#if m.response.provider}<span class="font-mono">{m.response.provider}{m.response.model ? `·${m.response.model}` : ''}</span>{/if}
                  {#if m.response.cache_hit}<span>cached</span>{/if}
                  {#if m.response.cost_usd !== undefined}<span class="font-mono">{fmtCost(m.response.cost_usd)}</span>{/if}
                </div>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Composer -->
    <div class="border-t border-line-1 bg-bg-0/80 p-3 backdrop-blur">
      <div class={['mx-auto flex items-end gap-2', squeezed ? 'max-w-none' : 'max-w-2xl'].join(' ')}>
        <textarea
          bind:value={input}
          onkeydown={onKeydown}
          rows="1"
          placeholder={connected ? 'Ask anything about this database…' : 'Connect to ask'}
          disabled={!connected || locked}
          class="max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-line-2 bg-bg-1 px-3 py-2 font-mono text-[12px] text-fg-0 placeholder:text-fg-3 focus:border-line-3 focus:outline-none disabled:opacity-50"
        ></textarea>
        <button
          type="button"
          onclick={send}
          disabled={!canSend}
          class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12px] font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CornerDownLeft class="size-3.5" />
          Ask
        </button>
      </div>
    </div>
  </div>
{/snippet}

{#snippet visualization()}
  <div class="flex h-full flex-col overflow-hidden bg-bg-1">
    {#if artifactMessage?.response}
      {@const r = artifactMessage.response}
      <div class="flex items-center justify-between border-b border-line-1 px-4 py-2.5">
        <span class="type-label">grounding · {r.sources_flat.length} source{r.sources_flat.length === 1 ? '' : 's'}</span>
        <span class="font-mono text-[10px] text-fg-3">{r.provider ?? ''}{r.model ? ` · ${r.model}` : ''}</span>
      </div>
      <div class="flex-1 overflow-auto p-3">
        <div class="grid gap-2">
          {#each r.sources_flat as src, si (src.urn + si)}
            {@const ref = parseUrn(src.urn)}
            <div class={[
              'rounded border bg-bg-0 p-2.5 transition-colors',
              highlightMarker === si + 1 ? 'border-accent' : 'border-line-1',
            ].join(' ')}>
              <div class="mb-1.5 flex items-center gap-2">
                <span class="inline-flex size-4 items-center justify-center rounded bg-accent/15 text-[9px] font-semibold text-accent">{si + 1}</span>
                <Badge tone={SOURCE_TONE[src.kind] ?? 'neutral'}>{src.kind}</Badge>
                {#if ref}<span class="font-mono text-[10px] text-fg-2">{ref.collection}<span class="text-fg-3">/{ref.id}</span></span>{/if}
                {#if src.score !== undefined}<span class="ml-auto font-mono text-[10px] text-fg-3">score {src.score.toFixed(2)}</span>{/if}
              </div>
              <pre class="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-fg-1">{formatContent(src.content)}</pre>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="flex h-full items-center justify-center font-mono text-[12px] text-fg-3">no grounding to show</div>
    {/if}
  </div>
{/snippet}

<div class="h-full overflow-hidden bg-bg-0 text-fg-1">
  {#if locked}
    <div class="p-6"><EmptyState icon={Lock} title="Locked" message="Unlock the secure store to ask." /></div>
  {:else if !connected}
    <div class="p-6"><EmptyState icon={Sparkles} title="Not connected" message="Connect to a reddb instance to ask grounded questions." /></div>
  {:else if splitOpen}
    <div class="grid h-full grid-cols-[minmax(340px,42%)_1fr] overflow-hidden">
      <div class="min-h-0 border-r border-line-1">{@render conversation(true)}</div>
      <div class="min-h-0">{@render visualization()}</div>
    </div>
  {:else}
    {@render conversation(false)}
  {/if}
</div>
