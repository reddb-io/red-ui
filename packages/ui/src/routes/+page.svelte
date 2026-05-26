<script lang="ts">
  import { connection } from '$lib/connections.svelte'
  import LiveChanges from '$lib/LiveChanges.svelte'
  import SchemaTree from '$lib/SchemaTree.svelte'
  import { CAPABILITY_GLYPHS, type Capability } from '$lib/capability'
  import { Database, Plus, X } from 'lucide-svelte'

  const connected = $derived(connection.connected)

  type Tab =
    | { id: string; kind: 'welcome' }
    | { id: string; kind: 'live-changes'; collection?: string }
    | { id: string; kind: 'collection'; collection: string; capability: Capability }

  let tabs = $state<Tab[]>([{ id: 'welcome', kind: 'welcome' }])
  let activeId = $state<string>('welcome')
  let menuOpen = $state(false)

  const active = $derived(tabs.find((t) => t.id === activeId) ?? tabs[0])

  function openLiveChanges(collection?: string) {
    const id = collection ? `live:${collection}` : 'live:global'
    if (!tabs.some((t) => t.id === id)) {
      tabs = [...tabs, { id, kind: 'live-changes', collection }]
    }
    activeId = id
    menuOpen = false
  }

  function openCollection(collection: string, capability: Capability) {
    const id = `coll:${collection}`
    if (!tabs.some((t) => t.id === id)) {
      tabs = [...tabs, { id, kind: 'collection', collection, capability }]
    }
    activeId = id
  }

  function closeTab(id: string) {
    if (tabs.length === 1) return
    const idx = tabs.findIndex((t) => t.id === id)
    tabs = tabs.filter((t) => t.id !== id)
    if (activeId === id) activeId = (tabs[idx - 1] ?? tabs[0]).id
  }

  function tabLabel(t: Tab): string {
    if (t.kind === 'welcome') return 'Workspace'
    if (t.kind === 'collection') return t.collection
    return t.collection ? `live · ${t.collection}` : 'live · global'
  }
</script>

<div class="h-full grid grid-cols-[260px_1fr] bg-bg-0 text-fg-1">
  <!-- SchemaTree (left) -->
  <aside class="row-start-1 col-start-1 border-r border-line-1 bg-bg-0 overflow-y-auto">
    <SchemaTree onopen={openCollection} />
  </aside>

  <!-- ResultsPane (center) -->
  <section class="row-start-1 col-start-2 bg-bg-0 overflow-hidden flex flex-col">
    <!-- Tab strip (interim — full tab system lands with #7) -->
    <div class="h-8 border-b border-line-1 flex items-center bg-bg-1/40">
      {#each tabs as t (t.id)}
        <button
          type="button"
          onclick={() => (activeId = t.id)}
          class={[
            'h-full px-3 inline-flex items-center gap-2 text-[11px] font-mono border-r border-line-1',
            activeId === t.id ? 'text-fg-1 bg-bg-0' : 'text-fg-3 hover:text-fg-2',
          ].join(' ')}
        >
          <span>{tabLabel(t)}</span>
          {#if tabs.length > 1 && t.kind !== 'welcome'}
            <span
              role="button"
              tabindex="0"
              class="text-fg-3 hover:text-accent"
              onclick={(ev) => {
                ev.stopPropagation()
                closeTab(t.id)
              }}
              onkeydown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.stopPropagation()
                  closeTab(t.id)
                }
              }}
            >
              <X class="size-3" />
            </span>
          {/if}
        </button>
      {/each}

      <div class="relative">
        <button
          type="button"
          class="h-full px-2 inline-flex items-center text-fg-3 hover:text-fg-1"
          aria-label="Open tab menu"
          onclick={() => (menuOpen = !menuOpen)}
        >
          <Plus class="size-3.5" />
        </button>
        {#if menuOpen}
          <div
            role="menu"
            class="absolute left-0 top-full mt-1 z-10 min-w-[220px] rounded border border-line-1 bg-bg-1 shadow-lg p-1 text-[12px] font-mono"
          >
            <button
              type="button"
              class="w-full text-left px-2 py-1 rounded hover:bg-bg-2 text-fg-1"
              onclick={() => openLiveChanges(undefined)}
            >
              Live changes (global)
            </button>
            <button
              type="button"
              class="w-full text-left px-2 py-1 rounded hover:bg-bg-2 text-fg-2 disabled:opacity-40"
              disabled
              title="Pick a collection from the schema tree (lands with #7)"
            >
              Live changes (this collection)
            </button>
          </div>
        {/if}
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      {#if active.kind === 'welcome'}
        <div class="h-full grid place-items-center p-6">
          {#if connected}
            <div class="text-center text-fg-3 text-[12px] font-mono">
              Connected to <span class="text-fg-1">{connection.active.url}</span>.
              <br />
              Open <span class="text-fg-1">+ &rarr; Live changes</span> to watch the CDC stream.
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
      {:else if active.kind === 'live-changes'}
        <LiveChanges collection={active.collection} />
      {:else if active.kind === 'collection'}
        <div class="h-full grid place-items-center p-6">
          <div class="text-center max-w-md">
            <div class="font-mono text-3xl text-fg-3 mb-3" aria-hidden="true">
              {CAPABILITY_GLYPHS[active.capability].glyph}
            </div>
            <h2 class="type-h2 m-0 mb-2">{active.collection}</h2>
            <p class="text-fg-3 text-[12px] font-mono m-0">
              {CAPABILITY_GLYPHS[active.capability].label} · ResultsPane lands with #7
            </p>
          </div>
        </div>
      {/if}
    </div>
  </section>
</div>
