<script lang="ts">
  import { connection } from '$lib/connections.svelte'
  import { tabs, type Tab } from '$lib/tabs.svelte'
  import { registry } from '$lib/renderers'
  import type { QueryResult } from '@red-ui/protocol'
  import { X, Activity, Database } from 'lucide-svelte'

  // One result per tab id. null = loading or unloaded; error string = failure.
  let results = $state<Record<string, QueryResult | null>>({})
  let errors = $state<Record<string, string>>({})
  // Remembered "previously active" id, so close-of-active returns focus
  // correctly. Updated whenever the active id moves to a stable tab.
  let previousActiveId = $state<string | null>(null)
  let lastActiveId: string | null = null

  $effect(() => {
    const current = tabs.activeId
    if (current !== lastActiveId) {
      previousActiveId = lastActiveId
      lastActiveId = current
    }
  })

  // Whenever a tab's identity exists but no result has been fetched, fetch it.
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
    tabs.close(id, previousActiveId)
    delete results[id]
    delete errors[id]
  }

  function pickRenderer(tab: Tab, result: QueryResult) {
    return registry.pick(tab.capability ?? (result.capability as any), result, tab.overrideCapability)
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
  </div>
</div>
