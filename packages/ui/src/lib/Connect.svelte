<script lang="ts">
  import { Badge } from '@red-ui/ui-kit'
  import { connection, PRESETS, makeCustomConnection, type ConnectionPreset } from './connections.svelte'
  import { Zap, Loader2, AlertCircle, CheckCircle2 } from 'lucide-svelte'

  let url = $state(connection.active.url || PRESETS[1].url)
  let status = $state<'idle' | 'probing' | 'ok' | 'error'>('idle')
  let error = $state<string | null>(null)
  let rtt = $state<number | null>(null)
  let probing = $state<string | null>(null)

  async function attempt(preset: ConnectionPreset) {
    probing = preset.id
    status = 'probing'
    error = null
    rtt = null
    const ok = await connection.tryConnect(preset)
    probing = null
    if (ok) {
      status = 'ok'
      rtt = connection.probe.rtt_ms ?? null
    } else {
      status = 'error'
      error = connection.probe.error ?? 'unreachable'
    }
  }

  async function submitCustom(e: Event) {
    e.preventDefault()
    if (!url.trim()) return
    const cleaned = url.trim().replace(/\/$/, '')
    await attempt(makeCustomConnection(cleaned))
  }

  function matchedPreset(u: string) {
    return PRESETS.find((p) => p.url === u)
  }
</script>

<div class="fixed inset-0 z-50 grid place-items-center bg-bg-0 overflow-auto">
  <div class="w-full max-w-[520px] p-8">
    <!-- Brand -->
    <div class="flex items-center gap-2 mb-10">
      <div class="w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent-glow)]"></div>
      <span class="font-mono font-semibold text-fg-0 text-[14px] tracking-tight">red<span class="text-accent">·</span>ui</span>
    </div>

    <!-- Hero -->
    <h1 class="type-h1 mb-2">Connect to reddb</h1>
    <p class="text-fg-2 text-[13px] mb-8 leading-relaxed">
      Paste a connection string or pick one of the presets below.
      Your choice is remembered for next time.
    </p>

    <!-- Connection input -->
    <form onsubmit={submitCustom} class="mb-8">
      <label class="type-label block mb-2">Connection string</label>
      <div class="flex gap-2">
        <input
          bind:value={url}
          spellcheck="false"
          placeholder="http://localhost:8080"
          class="flex-1 h-10 px-3 bg-bg-1 border border-line-2 rounded-md font-mono text-[13px] text-fg-0 outline-none transition-colors focus:border-accent focus:bg-bg-0 placeholder:text-fg-3"
        />
        <button
          type="submit"
          disabled={status === 'probing'}
          class="h-10 px-5 bg-accent text-white font-medium rounded-md cursor-pointer transition-colors hover:bg-[#ff3868] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_0_1px_var(--color-accent),0_4px_14px_-4px_var(--color-accent-glow)]"
        >
          {#if status === 'probing'}
            <Loader2 class="size-4 animate-spin" />
            Probing
          {:else}
            <Zap class="size-4" />
            Connect
          {/if}
        </button>
      </div>

      <!-- Status line under the input -->
      <div class="h-6 mt-2 flex items-center gap-2 text-[12px] font-mono">
        {#if status === 'ok'}
          <CheckCircle2 class="size-3.5 text-ok" />
          <span class="text-ok">Connected · {rtt}ms RTT</span>
        {:else if status === 'error'}
          <AlertCircle class="size-3.5 text-danger" />
          <span class="text-danger truncate">{error}</span>
        {:else if status === 'idle'}
          <span class="text-fg-3">Press Enter or click Connect.</span>
        {/if}
      </div>
    </form>

    <!-- Presets -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-2">
        <span class="type-label">Presets</span>
        <span class="text-[10px] font-mono text-fg-3">click to test &amp; connect</span>
      </div>
      <div class="grid gap-2">
        {#each PRESETS as p}
          <button
            onclick={() => attempt(p)}
            disabled={probing !== null}
            class={[
              'flex items-center justify-between gap-3 p-3 rounded-md bg-bg-1 border border-line-1 cursor-pointer text-left transition-all',
              'hover:border-line-3 hover:bg-bg-2 disabled:opacity-50 disabled:cursor-not-allowed',
              matchedPreset(url)?.id === p.id ? 'border-accent/40' : ''
            ].join(' ')}
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-fg-0 text-[13px] font-medium">{p.label}</span>
                <Badge tone={p.role === 'primary' ? 'accent' : p.role === 'replica' ? 'info' : 'ok'}>{p.role}</Badge>
              </div>
              <code class="text-fg-3 text-[11px] font-mono">{p.url}</code>
            </div>
            {#if probing === p.id}
              <Loader2 class="size-4 text-accent animate-spin shrink-0" />
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Helper footer -->
    <div class="pt-6 border-t border-line-1 text-[11px] font-mono text-fg-3 space-y-1.5">
      <div>No instance running? Start one:</div>
      <code class="block text-fg-2 bg-bg-1 border border-line-1 rounded p-2">./scripts/embedded.sh</code>
      <code class="block text-fg-2 bg-bg-1 border border-line-1 rounded p-2">docker compose -f docker/compose.yml up -d</code>
    </div>
  </div>
</div>
