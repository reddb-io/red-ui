<script lang="ts">
  import { CodeBlock } from "@reddb-io/design-system/base"
  import { Input as DSInput, Textarea as DSTextarea, Button as DSButton } from '@reddb-io/design-system/base'
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

<main class="min-h-screen bg-background text-foreground">
  <div class="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-6 font-mono">
    <header class="flex flex-col gap-2 border-b border-muted pb-4">
      <div class="text-[11px] uppercase tracking-wide text-ink-muted">Dev spike</div>
      <h1 class="text-xl font-semibold">RedWire over WebSocket</h1>
      <p class="max-w-3xl text-[12px] leading-5 text-ink-muted">
        Opens a WSS RedWire endpoint, negotiates the versioned subprotocol, completes bearer auth,
        sends one binary framed query, and decodes the result. This route is isolated from the
        production transport path.
      </p>
    </header>

    {#if !enabled}
      <section class="rounded border border-muted bg-elevation-base-surface p-4 text-[12px] text-ink-muted">
        Enable with <span class="text-foreground">VITE_REDWIRE_WS_SPIKE=1</span> or run in dev mode.
      </section>
    {/if}

    <section class="grid gap-4 md:grid-cols-[1fr_1fr]">
      <label class="flex flex-col gap-1 text-[12px] text-ink-muted">
        Endpoint origin or WSS URL
        <DSInput

          bind:value={endpoint}
          disabled={!enabled || running}
        />
      </label>
      <label class="flex flex-col gap-1 text-[12px] text-ink-muted">
        Bearer token
        <DSInput

          bind:value={token}
          type="password"
          disabled={!enabled || running}
        />
      </label>
    </section>

    <label class="flex flex-col gap-1 text-[12px] text-ink-muted">
      Query
      <DSTextarea
        class="min-h-28"
        bind:value={query}
        disabled={!enabled || running}
      ></DSTextarea>
    </label>

    <div class="flex flex-wrap items-center gap-3">
      <DSButton variant="primary" size="sm"
        type="button"

        disabled={!enabled || running || !resolvedEndpoint || !token.trim() || !query.trim()}
        onclick={runSpike}
      >
        {running ? 'Running' : 'Run WSS query'}
      </DSButton>
      <div class="text-[11px] text-ink-muted">
        Resolved endpoint: <span class="text-ink-muted">{resolvedEndpoint || 'n/a'}</span>
      </div>
    </div>

    {#if error}
      <section class="rounded border border-feedback-danger-border/50 bg-elevation-base-surface p-4 text-[12px] text-feedback-danger-foreground">
        <CodeBlock code={error} />
      </section>
    {/if}

    {#if result}
      <section class="rounded border border-muted bg-elevation-base-surface p-4">
        <div class="mb-2 text-[12px] font-semibold text-ink-muted">Decoded result</div>
        <CodeBlock code={JSON.stringify(result, null, 2)} />
      </section>
    {/if}
  </div>
</main>
