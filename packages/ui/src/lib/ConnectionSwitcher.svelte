<script lang="ts">
  import { onMount } from 'svelte'
  import { Badge } from '@red-ui/ui-kit'
  import type { Connection } from '@red-ui/protocol'
  import { connection, provider, PRESETS } from './connections.svelte'

  let open = $state(false)
  let items = $state<Connection[]>(PRESETS)

  onMount(() => {
    provider.list().then((list) => (items = list))
    connection.refresh()
    const id = setInterval(() => connection.refresh(), 5000)
    return () => clearInterval(id)
  })

  async function pick(c: Connection) {
    const preset = PRESETS.find((p) => p.id === c.id) ?? {
      ...c,
      description: 'Saved connection.',
    }
    await connection.switch(preset as any)
    open = false
  }

  const dotColor = $derived(
    connection.active.id === 'fixtures' ? 'var(--fg-3)' : connection.probe.reachable ? 'var(--ok)' : 'var(--danger)',
  )

  const statusLabel = $derived(
    connection.active.id === 'fixtures'
      ? 'offline'
      : connection.probe.reachable
        ? `${connection.probe.rtt_ms}ms`
        : 'unreachable',
  )
</script>

<div class="wrap">
  <button class="trigger" onclick={() => (open = !open)} title="Switch connection">
    <span class="dot" style="background: {dotColor}"></span>
    <span class="label">{connection.active.label}</span>
    <span class="status">{statusLabel}</span>
    <span class="chev">▾</span>
  </button>

  {#if open}
    <div class="scrim" onclick={() => (open = false)} role="presentation"></div>
    <div class="menu">
      <div class="menu-label">Targets</div>
      {#each items as p}
        <button class="opt" class:active={p.id === connection.active.id} onclick={() => pick(p)}>
          <div class="opt-head">
            <span class="opt-label">{p.label}</span>
            <Badge tone={p.role === 'primary' ? 'accent' : p.role === 'replica' ? 'info' : 'neutral'}>{p.role ?? 'primary'}</Badge>
          </div>
          <div class="opt-url">{p.url || '— no network —'}</div>
          <div class="opt-desc">{p.description ?? ''}</div>
        </button>
      {/each}

      {#if connection.probe.reachable && connection.probe.stats}
        <div class="menu-label">Live</div>
        <div class="live">
          <div><span>collections</span><code>{connection.probe.stats.store.collection_count}</code></div>
          <div><span>entities</span><code>{connection.probe.stats.store.total_entities}</code></div>
          {#if connection.probe.replication && connection.probe.replication.role !== 'standalone'}
            <div><span>role</span><code>{connection.probe.replication.role}</code></div>
            {#if connection.probe.replication.last_applied_lsn !== undefined}
              <div><span>lsn</span><code>{connection.probe.replication.last_applied_lsn} / {connection.probe.replication.last_seen_primary_lsn}</code></div>
            {/if}
          {/if}
        </div>
      {:else if connection.probe.error}
        <div class="err">⚠ {connection.probe.error}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .wrap { position: relative; }
  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    padding: 0 10px;
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    border-radius: var(--r-md);
    color: var(--fg-1);
    cursor: pointer;
    font-size: 12px;
  }
  .trigger:hover { border-color: var(--line-3); color: var(--fg-0); }
  .dot { width: 8px; height: 8px; border-radius: 9999px; box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 15%, transparent); }
  .label { font-family: var(--font-mono); }
  .status { color: var(--fg-3); font-family: var(--font-mono); font-size: 10px; }
  .chev { color: var(--fg-3); font-size: 10px; }

  .scrim { position: fixed; inset: 0; z-index: 50; }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 320px;
    background: var(--bg-1);
    border: 1px solid var(--line-2);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-lg);
    padding: 8px;
    z-index: 51;
  }
  .menu-label {
    padding: 8px 8px 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-3);
  }
  .opt {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 8px;
    border-radius: var(--r-md);
    cursor: pointer;
  }
  .opt:hover { background: var(--bg-2); }
  .opt.active { background: var(--bg-2); box-shadow: inset 2px 0 0 var(--accent); }
  .opt-head { display: flex; justify-content: space-between; align-items: center; }
  .opt-label { font-family: var(--font-mono); font-size: 12px; color: var(--fg-0); }
  .opt-url { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); margin-top: 2px; }
  .opt-desc { font-size: 11px; color: var(--fg-2); margin-top: 4px; line-height: 1.4; }

  .live {
    display: grid;
    gap: 4px;
    padding: 6px 8px 4px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .live > div { display: flex; justify-content: space-between; }
  .live span { color: var(--fg-3); }
  .live code { color: var(--accent); }

  .err {
    padding: 8px;
    font-size: 11px;
    color: var(--danger);
    font-family: var(--font-mono);
  }
</style>
