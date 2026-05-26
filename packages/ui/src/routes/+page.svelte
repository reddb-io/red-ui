<script lang="ts">
  import { connection } from '$lib/connections.svelte'
  import { Database, Table2, Activity, Plug } from 'lucide-svelte'

  const connected = $derived(connection.connected)
</script>

<div class="h-full grid grid-cols-[260px_1fr] bg-bg-0 text-fg-1">
  <!-- SchemaTree (left) -->
  <aside class="row-start-1 col-start-1 border-r border-line-1 bg-bg-0 overflow-y-auto">
    <div class="px-3 py-2 border-b border-line-1 flex items-center gap-2 text-fg-3">
      <Table2 class="size-3.5" />
      <span class="type-label">Schema</span>
    </div>
    <div class="p-3">
      {#if connected}
        <div class="text-[12px] font-mono text-fg-3">
          {connection.probe.stats?.store.collection_count ?? 0} collections
        </div>
      {:else}
        <div class="flex flex-col items-start gap-2 text-[12px] text-fg-3 font-mono leading-relaxed">
          <Plug class="size-4 text-fg-3" />
          <span>No schema to show.</span>
          <span>Connect to a reddb instance to inspect collections.</span>
        </div>
      {/if}
    </div>
  </aside>

  <!-- ResultsPane (center) -->
  <section class="row-start-1 col-start-2 bg-bg-0 overflow-hidden flex flex-col">
    <div class="px-3 py-2 border-b border-line-1 flex items-center gap-2 text-fg-3">
      <Activity class="size-3.5" />
      <span class="type-label">Results</span>
    </div>
    <div class="flex-1 grid place-items-center p-6">
      {#if connected}
        <div class="text-center text-fg-3 text-[12px] font-mono">
          Connected to <span class="text-fg-1">{connection.active.url}</span>.
          <br />
          Pick a collection from the left to start.
        </div>
      {:else}
        <div class="text-center max-w-md">
          <Database class="size-8 text-fg-3 mx-auto mb-3" strokeWidth={1.4} />
          <h2 class="type-h2 m-0 mb-2">Workspace</h2>
          <p class="text-fg-2 text-[13px] m-0">
            Connect to a reddb instance from the topbar to start browsing collections,
            running queries, and inspecting state.
          </p>
        </div>
      {/if}
    </div>
  </section>
</div>
