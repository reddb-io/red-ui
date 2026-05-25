<script lang="ts">
  import { connection, makeCustomConnection } from './connections.svelte'
  import { Zap, Loader2, AlertCircle, CheckCircle2, Clock, X } from 'lucide-svelte'

  let url = $state(connection.active.url || '')
  let status = $state<'idle' | 'probing' | 'ok' | 'error'>('idle')
  let error = $state<string | null>(null)
  let rtt = $state<number | null>(null)

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
</script>

<div class="fixed inset-0 z-50 grid place-items-center bg-bg-0 overflow-auto">
  <div class="w-full max-w-[440px] p-8">
    <!-- Brand -->
    <div class="flex items-center justify-center gap-2 mb-12">
      <div class="w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent-glow)]"></div>
      <span class="font-mono font-semibold text-fg-0 text-[14px] tracking-tight">red<span class="text-accent">·</span>ui</span>
    </div>

    <!-- Hero -->
    <h1 class="type-h1 text-center mb-2">Connect to reddb</h1>
    <p class="text-fg-2 text-[13px] text-center mb-10">
      Enter your instance URL to get started.
    </p>

    <!-- Connection input -->
    <form onsubmit={submit}>
      <input
        bind:value={url}
        spellcheck="false"
        placeholder="http://localhost:8080"
        class="w-full h-11 px-3.5 mb-2 bg-bg-1 border border-line-2 rounded-md font-mono text-[14px] text-fg-0 outline-none transition-colors focus:border-accent focus:bg-bg-0 placeholder:text-fg-3"
      />

      <button
        type="submit"
        disabled={status === 'probing' || !url.trim()}
        class="w-full h-11 bg-accent text-white font-medium rounded-md cursor-pointer transition-colors hover:bg-[#ff3868] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_0_1px_var(--color-accent),0_4px_14px_-4px_var(--color-accent-glow)]"
      >
        {#if status === 'probing'}
          <Loader2 class="size-4 animate-spin" />
          Connecting…
        {:else}
          <Zap class="size-4" />
          Connect
        {/if}
      </button>

      <!-- Status line -->
      <div class="h-5 mt-3 flex items-center justify-center gap-1.5 text-[12px] font-mono">
        {#if status === 'ok'}
          <CheckCircle2 class="size-3.5 text-ok" />
          <span class="text-ok">Connected · {rtt}ms</span>
        {:else if status === 'error'}
          <AlertCircle class="size-3.5 text-danger" />
          <span class="text-danger truncate">{error}</span>
        {/if}
      </div>
    </form>

    <!-- History -->
    {#if connection.history.length > 0}
      <div class="mt-10 pt-6 border-t border-line-1">
        <div class="flex items-center gap-1.5 mb-3">
          <Clock class="size-3 text-fg-3" />
          <span class="type-label">Recent connections</span>
        </div>
        <div class="grid gap-1">
          {#each connection.history as h}
            <div class="group flex items-center gap-2 rounded-md hover:bg-bg-2 transition-colors">
              <button
                onclick={() => attempt(h.url)}
                disabled={status === 'probing'}
                class="flex-1 flex items-center justify-between gap-3 px-3 py-2 text-left cursor-pointer bg-transparent border-0 disabled:cursor-not-allowed disabled:opacity-50 min-w-0"
              >
                <code class="font-mono text-[12px] text-fg-1 truncate">{h.url}</code>
                <span class="font-mono text-[10px] text-fg-3 shrink-0 flex items-center gap-2">
                  {#if h.rtt_ms !== undefined}<span class="text-fg-3">{h.rtt_ms}ms</span>{/if}
                  <span>{fmtRel(h.last_used)}</span>
                </span>
              </button>
              <button
                onclick={(e) => forget(e, h.url)}
                title="Remove from history"
                class="opacity-0 group-hover:opacity-100 p-1 mr-1 text-fg-3 hover:text-danger transition-all cursor-pointer bg-transparent border-0"
              >
                <X class="size-3" />
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
