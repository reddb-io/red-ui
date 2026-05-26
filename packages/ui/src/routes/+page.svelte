<script lang="ts">
  import { connection } from '$lib/connections.svelte'
  import { tabs } from '$lib/tabs.svelte'
  import SchemaTree from '$lib/SchemaTree.svelte'
  import ResultsPane from '$lib/ResultsPane.svelte'

  const connected = $derived(connection.connected)

  function openCollection(name: string, forceNew: boolean) {
    tabs.open(
      {
        kind: 'collection',
        label: name,
        key: name,
        capability: 'table',
      },
      forceNew,
    )
  }
</script>

<div class="h-full grid grid-rows-[28px_1fr] grid-cols-[260px_1fr] bg-bg-0 text-fg-1">
  <!-- StatusBar (spans top) -->
  <div class="col-span-2 row-start-1 h-7 flex items-center justify-between px-3 border-b border-line-1 bg-bg-1/60 text-[11px] font-mono">
    <div class="flex items-center gap-3 text-fg-3">
      <span class="inline-flex items-center gap-1.5">
        <span class={['w-1.5 h-1.5 rounded-full', connected ? 'bg-ok' : 'bg-fg-3'].join(' ')}></span>
        <span>{connected ? connection.active.label : 'no connection'}</span>
      </span>
      {#if connected && connection.probe.rtt_ms !== undefined}
        <span>·</span>
        <span>{connection.probe.rtt_ms}ms</span>
      {/if}
      {#if connected && connection.probe.stats}
        <span>·</span>
        <span>{connection.probe.stats.store.collection_count} collections</span>
        <span>·</span>
        <span>{connection.probe.stats.store.total_entities.toLocaleString()} entities</span>
      {/if}
    </div>
    <div class="text-fg-3">workspace</div>
  </div>

  <!-- SchemaTree (left) -->
  <aside class="row-start-2 col-start-1 border-r border-line-1 bg-bg-0 overflow-hidden">
    <SchemaTree onOpen={openCollection} />
  </aside>

  <!-- ResultsPane (center) -->
  <section class="row-start-2 col-start-2 bg-bg-0 overflow-hidden">
    <ResultsPane />
  </section>
</div>
