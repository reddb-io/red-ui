<script lang="ts">
  import { dev } from '$app/environment'
  import {
    RedWireSpikeError,
    redwireWsUrlFromHttp,
    runRedWireWsSpike,
    type RedWireWsSpikeResult,
  } from '$lib/reddb/redwire-ws-spike'

  const enabled = dev || import.meta.env.VITE_REDWIRE_WS_SPIKE === '1'

  let endpoint = $state('https://localhost:5055')
  let token = $state('')
  let query = $state('SELECT 1')
  let running = $state(false)
  let result = $state<RedWireWsSpikeResult | null>(null)
  let error = $state<string | null>(null)

  const resolvedEndpoint = $derived(endpoint.trim() ? redwireWsUrlFromHttp(endpoint.trim()) : '')

  async function runSpike() {
    if (!enabled || running) return
    running = true
    result = null
    error = null
    try {
      result = await runRedWireWsSpike({
        url: resolvedEndpoint,
        token,
        query,
      })
    } catch (e) {
      if (e instanceof RedWireSpikeError) {
        error = `${e.code}: ${e.message}`
      } else {
        error = e instanceof Error ? e.message : String(e)
      }
    } finally {
      running = false
    }
  }
</script>

<svelte:head>
  <title>RedWire WS spike</title>
</svelte:head>

<main class="min-h-screen bg-bg-0 text-fg-1">
  <div class="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-6 font-mono">
    <header class="flex flex-col gap-2 border-b border-line-1 pb-4">
      <div class="text-[11px] uppercase tracking-wide text-fg-3">Dev spike</div>
      <h1 class="text-xl font-semibold">RedWire over WebSocket</h1>
      <p class="max-w-3xl text-[12px] leading-5 text-fg-3">
        Opens a WSS RedWire endpoint, negotiates the versioned subprotocol, completes bearer auth,
        sends one binary framed query, and decodes the result. This route is isolated from the
        production transport path.
      </p>
    </header>

    {#if !enabled}
      <section class="rounded border border-line-1 bg-bg-1 p-4 text-[12px] text-fg-3">
        Enable with <span class="text-fg-1">VITE_REDWIRE_WS_SPIKE=1</span> or run in dev mode.
      </section>
    {/if}

    <section class="grid gap-4 md:grid-cols-[1fr_1fr]">
      <label class="flex flex-col gap-1 text-[12px] text-fg-2">
        Endpoint origin or WSS URL
        <input
          class="h-9 rounded border border-line-2 bg-bg-1 px-2 text-fg-1 outline-none focus:border-accent"
          bind:value={endpoint}
          disabled={!enabled || running}
        />
      </label>
      <label class="flex flex-col gap-1 text-[12px] text-fg-2">
        Bearer token
        <input
          class="h-9 rounded border border-line-2 bg-bg-1 px-2 text-fg-1 outline-none focus:border-accent"
          bind:value={token}
          type="password"
          disabled={!enabled || running}
        />
      </label>
    </section>

    <label class="flex flex-col gap-1 text-[12px] text-fg-2">
      Query
      <textarea
        class="min-h-28 rounded border border-line-2 bg-bg-1 p-2 text-fg-1 outline-none focus:border-accent"
        bind:value={query}
        disabled={!enabled || running}
      ></textarea>
    </label>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="h-9 rounded border border-accent bg-accent px-3 text-[12px] font-semibold text-bg-0 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!enabled || running || !resolvedEndpoint || !token.trim() || !query.trim()}
        onclick={runSpike}
      >
        {running ? 'Running' : 'Run WSS query'}
      </button>
      <div class="text-[11px] text-fg-3">
        Resolved endpoint: <span class="text-fg-2">{resolvedEndpoint || 'n/a'}</span>
      </div>
    </div>

    {#if error}
      <section class="rounded border border-danger/50 bg-bg-1 p-4 text-[12px] text-danger">
        <pre class="m-0 whitespace-pre-wrap">{error}</pre>
      </section>
    {/if}

    {#if result}
      <section class="rounded border border-line-1 bg-bg-1 p-4">
        <div class="mb-2 text-[12px] font-semibold text-fg-2">Decoded result</div>
        <pre class="m-0 max-h-[520px] overflow-auto text-[11px] leading-5 text-fg-2">{JSON.stringify(result, null, 2)}</pre>
      </section>
    {/if}
  </div>
</main>
