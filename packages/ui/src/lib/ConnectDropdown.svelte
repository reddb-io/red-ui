<script lang="ts">
  import { onMount } from 'svelte'
  import { connection, makeCustomConnection } from './connections.svelte'
  import { Zap, Loader2, AlertCircle, CheckCircle2, Clock, X, Plug, ChevronDown } from 'lucide-svelte'

  const DEFAULT_URL = 'red://localhost'

  function pickDefaultUrl(): string {
    if (connection.history[0]?.url) return connection.history[0].url
    if (connection.active.url) return connection.active.url
    return DEFAULT_URL
  }

  let open = $state(false)
  let url = $state(pickDefaultUrl())
  let status = $state<'idle' | 'probing' | 'ok' | 'error'>('idle')
  let error = $state<string | null>(null)
  let rtt = $state<number | null>(null)
  let menuEl: HTMLDivElement | undefined = $state()
  let inputEl: HTMLInputElement | undefined = $state()

  async function attempt(targetUrl: string) {
    const cleaned = targetUrl.trim().replace(/\/$/, '')
    if (!cleaned) return
    url = cleaned
    status = 'probing'
    error = null
    rtt = null
    const ok = await connection.tryConnect(makeCustomConnection(cleaned))
    if (ok) {
      status = 'ok'
      rtt = connection.probe.rtt_ms ?? null
      setTimeout(() => (open = false), 350)
    } else {
      status = 'error'
      error = connection.probe.error ?? 'unreachable'
    }
  }

  function submit(e: Event) {
    e.preventDefault()
    attempt(url)
  }

  function fmtRel(ms: number) {
    const d = Date.now() - ms
    if (d < 60_000) return 'just now'
    if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`
    if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`
    return `${Math.round(d / 86_400_000)}d ago`
  }

  function forget(e: MouseEvent, u: string) {
    e.stopPropagation()
    connection.forget(u)
  }

  function toggle() {
    open = !open
    if (open) setTimeout(() => inputEl?.focus(), 0)
  }

  onMount(() => {
    const onOpen = () => {
      open = true
      setTimeout(() => inputEl?.focus(), 0)
    }
    window.addEventListener('red:open-connect', onOpen)
    return () => window.removeEventListener('red:open-connect', onOpen)
  })

  const dotClass = $derived(
    connection.connected ? 'bg-ok' : status === 'error' ? 'bg-danger' : 'bg-fg-3'
  )

  const triggerLabel = $derived(
    connection.connected ? connection.active.label : 'Connect'
  )

  const triggerStatus = $derived(
    connection.connected && connection.probe.rtt_ms !== undefined
      ? `${connection.probe.rtt_ms}ms`
      : connection.connected
        ? 'live'
        : 'no connection'
  )
</script>

<div class="relative">
  <button
    type="button"
    onclick={toggle}
    aria-haspopup="dialog"
    aria-expanded={open}
    title={connection.connected ? 'Switch connection' : 'Connect to reddb'}
    class="inline-flex items-center gap-2 h-7 pl-2 pr-1.5 bg-bg-2 border border-line-2 rounded-md text-fg-1 cursor-pointer text-xs transition-colors hover:border-line-3 hover:text-fg-0"
  >
    <span class={['w-1.5 h-1.5 rounded-full shrink-0', dotClass].join(' ')}></span>
    {#if !connection.connected}
      <Plug class="size-3 text-fg-3" />
    {/if}
    <span class="font-mono">{triggerLabel}</span>
    <span class="font-mono text-[10px] text-fg-3">{triggerStatus}</span>
    <ChevronDown class="size-3 text-fg-3" />
  </button>

  {#if open}
    <div class="fixed inset-0 z-40" onclick={() => (open = false)} role="presentation"></div>
    <div
      bind:this={menuEl}
      class="absolute top-[calc(100%+6px)] left-0 z-50 w-[380px] bg-bg-1 border border-line-2 rounded-lg shadow-2xl p-4"
      role="dialog"
      aria-label="Connect to reddb"
    >
      <form onsubmit={submit}>
        <label for="connect-url" class="type-label block mb-1.5">Instance URL</label>
        <input
          id="connect-url"
          bind:this={inputEl}
          bind:value={url}
          spellcheck="false"
          placeholder="red://localhost"
          class="w-full h-9 px-3 mb-2 bg-bg-0 border border-line-2 rounded-md font-mono text-[13px] text-fg-0 outline-none transition-colors focus:border-accent placeholder:text-fg-3"
        />

        <button
          type="submit"
          disabled={status === 'probing' || !url.trim()}
          class="w-full h-9 bg-accent text-white font-medium rounded-md cursor-pointer transition-colors hover:bg-[#ff3868] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[13px]"
        >
          {#if status === 'probing'}
            <Loader2 class="size-3.5 animate-spin" />
            Connecting…
          {:else}
            <Zap class="size-3.5" />
            Connect
          {/if}
        </button>

        <div class="h-5 mt-2 flex items-center gap-1.5 text-[11px] font-mono">
          {#if status === 'ok'}
            <CheckCircle2 class="size-3 text-ok" />
            <span class="text-ok">Connected{rtt !== null ? ` · ${rtt}ms` : ''}</span>
          {:else if status === 'error'}
            <AlertCircle class="size-3 text-danger" />
            <span class="text-danger truncate">{error}</span>
          {/if}
        </div>
      </form>

      {#if connection.history.length > 0}
        <div class="mt-3 pt-3 border-t border-line-1">
          <div class="flex items-center gap-1.5 mb-2">
            <Clock class="size-3 text-fg-3" />
            <span class="type-label">Recent</span>
          </div>
          <div class="grid gap-0.5 max-h-[180px] overflow-y-auto">
            {#each connection.history as h}
              <div class="group flex items-center gap-1 rounded hover:bg-bg-2 transition-colors">
                <button
                  type="button"
                  onclick={() => attempt(h.url)}
                  disabled={status === 'probing'}
                  class="flex-1 flex items-center justify-between gap-3 px-2 py-1.5 text-left cursor-pointer bg-transparent border-0 disabled:cursor-not-allowed disabled:opacity-50 min-w-0"
                >
                  <code class="font-mono text-[11px] text-fg-1 truncate">{h.url}</code>
                  <span class="font-mono text-[10px] text-fg-3 shrink-0 flex items-center gap-1.5">
                    {#if h.rtt_ms !== undefined}<span>{h.rtt_ms}ms</span>{/if}
                    <span>{fmtRel(h.last_used)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onclick={(e) => forget(e, h.url)}
                  title="Remove from history"
                  class="opacity-0 group-hover:opacity-100 p-1 mr-0.5 text-fg-3 hover:text-danger transition-all cursor-pointer bg-transparent border-0"
                >
                  <X class="size-3" />
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
