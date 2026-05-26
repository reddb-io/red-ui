<script lang="ts">
  import { onMount } from 'svelte'
  import { connection } from '$lib/connections.svelte'
  import { tabs, type Tab } from '$lib/tabs.svelte'
  import { queryTabs } from '$lib/query-tabs.svelte'
  import { registry } from '$lib/renderers'
  import LiveChanges from '$lib/LiveChanges.svelte'
  import QueryEditor from '$lib/QueryEditor.svelte'
  import type { QueryResult } from '@red-ui/protocol'
  import { X, Activity, Database, Plus, FileCode2 } from 'lucide-svelte'

  let results = $state<Record<string, QueryResult | null>>({})
  let errors = $state<Record<string, string>>({})
  let previousActiveId = $state<string | null>(null)
  let lastActiveId: string | null = null
  let menuOpen = $state(false)

  $effect(() => {
    const current = tabs.activeId
    if (current !== lastActiveId) {
      previousActiveId = lastActiveId
      lastActiveId = current
    }
  })

  $effect(() => {
    const client = connection.client
    if (!client) return
    for (const tab of tabs.tabs) {
      if (results[tab.id] !== undefined || errors[tab.id]) continue
      if (tab.kind !== 'collection') continue
      results[tab.id] = null
      const collection = tab.key
      client
        .query(`SELECT * FROM ${collection} LIMIT 200`)
        .then((r) => {
          results[tab.id] = r
        })
        .catch((e) => {
          errors[tab.id] = (e as Error).message
        })
    }
  })

  function closeTab(e: MouseEvent, id: string) {
    e.stopPropagation()
    const tab = tabs.tabs.find((t) => t.id === id)
    if (tab?.kind === 'query' && queryTabs.isDirty(id)) {
      const ok = typeof window !== 'undefined'
        ? window.confirm('Discard unsaved query in this tab?')
        : true
      if (!ok) return
    }
    tabs.close(id, previousActiveId)
    queryTabs.remove(id)
    delete results[id]
    delete errors[id]
  }

  function openNewQuery() {
    const label = queryTabs.nextLabel()
    const tab = tabs.open(
      { kind: 'query', label, key: label, capability: 'table' },
      true,
    )
    queryTabs.ensure(tab.id)
    menuOpen = false
  }

  onMount(() => {
    const onNewQuery = () => openNewQuery()
    window.addEventListener('red:new-query', onNewQuery)
    return () => window.removeEventListener('red:new-query', onNewQuery)
  })

  function pickRenderer(tab: Tab, result: QueryResult) {
    return registry.pick(tab.capability ?? (result.capability as any), result, tab.overrideCapability)
  }

  function openLiveChanges() {
    tabs.open({ kind: 'live-changes', label: 'live · global', key: 'global' })
    menuOpen = false
  }
</script>

<div class="h-full flex flex-col">
  <div class="border-b border-line-1 flex items-stretch min-h-[36px] bg-bg-0">
    {#if tabs.tabs.length === 0}
      <div class="px-3 py-2 flex items-center gap-2 text-fg-3">
        <Activity class="size-3.5" />
        <span class="type-label">Results</span>
      </div>
    {:else}
      <div class="flex items-stretch overflow-x-auto">
        {#each tabs.tabs as tab (tab.id)}
          {@const isActive = tab.id === tabs.activeId}
          <button
            type="button"
            class={[
              'group flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono border-r border-line-1 whitespace-nowrap',
              isActive
                ? 'bg-bg-1 text-fg-1 border-b-2 border-b-accent -mb-px'
                : 'text-fg-3 hover:text-fg-1 hover:bg-bg-1/40',
            ].join(' ')}
            onclick={() => tabs.focus(tab.id)}
            title={tab.label}
          >
            <span class="truncate max-w-[180px]">{tab.label}</span>
            <span
              class="opacity-60 group-hover:opacity-100 hover:bg-bg-2 rounded p-0.5"
              role="button"
              tabindex="-1"
              aria-label="Close tab"
              onclick={(e) => closeTab(e as unknown as MouseEvent, tab.id)}
              onkeydown={(e) => { if (e.key === 'Enter') closeTab(e as unknown as MouseEvent, tab.id) }}
            >
              <X class="size-3" />
            </span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="relative ml-auto flex items-stretch">
      <button
        type="button"
        class="px-2 inline-flex items-center text-fg-3 hover:text-fg-1"
        aria-label="Open tab menu"
        onclick={() => (menuOpen = !menuOpen)}
      >
        <Plus class="size-3.5" />
      </button>
      {#if menuOpen}
        <div
          role="menu"
          class="absolute right-0 top-full mt-1 z-10 min-w-[220px] rounded border border-line-1 bg-bg-1 shadow-lg p-1 text-[12px] font-mono"
        >
          <button
            type="button"
            class="w-full text-left px-2 py-1 rounded hover:bg-bg-2 text-fg-1 flex items-center gap-2"
            onclick={openNewQuery}
          >
            <FileCode2 class="size-3.5 text-fg-3" />
            <span class="flex-1">New query</span>
            <span class="text-fg-3 text-[10px]">⌘T</span>
          </button>
          <button
            type="button"
            class="w-full text-left px-2 py-1 rounded hover:bg-bg-2 text-fg-1"
            onclick={openLiveChanges}
          >
            Live changes (global)
          </button>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex-1 overflow-hidden bg-bg-0">
    {#if !tabs.active}
      <div class="h-full grid place-items-center p-6">
        {#if connection.connected}
          <div class="text-center text-fg-3 text-[12px] font-mono">
            Connected to <span class="text-fg-1">{connection.active.url}</span>.
            <br />
            Pick a collection from the left to open a tab.
          </div>
        {:else}
          <div class="text-center max-w-md">
            <Database class="size-8 text-fg-3 mx-auto mb-3" strokeWidth={1.4} />
            <h2 class="type-h2 m-0 mb-2">Workspace</h2>
            <p class="text-fg-2 text-[13px] m-0">
              Connect to a reddb instance from the topbar to start browsing
              collections and running queries.
            </p>
          </div>
        {/if}
      </div>
    {:else}
      {@const tab = tabs.active}
      {#if tab.kind === 'live-changes'}
        <LiveChanges collection={undefined} />
      {:else if tab.kind === 'query'}
        <QueryEditor tabId={tab.id} fallbackLabel={tab.key} />
      {:else if tab.kind === 'welcome'}
        <div class="h-full grid place-items-center text-fg-3 text-[12px] font-mono">
          Workspace
        </div>
      {:else}
        {@const result = results[tab.id]}
        {@const err = errors[tab.id]}
        {#if err}
          <div class="p-4 text-[12px] font-mono text-warn">
            <div class="font-semibold mb-1">Query failed</div>
            <pre class="whitespace-pre-wrap">{err}</pre>
          </div>
        {:else if !result}
          <div class="h-full grid place-items-center text-fg-3 text-[12px] font-mono">
            Loading {tab.label}…
          </div>
        {:else}
          {@const renderer = pickRenderer(tab, result)}
          {@const Renderer = renderer.component}
          <Renderer {result} collection={tab.kind === 'collection' ? tab.key : undefined} />
        {/if}
      {/if}
    {/if}
  </div>
</div>
