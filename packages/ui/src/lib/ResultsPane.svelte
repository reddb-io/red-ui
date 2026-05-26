<script lang="ts">
  import { connection } from '$lib/connections.svelte'
  import { tabs, type Tab } from '$lib/tabs.svelte'
  import { registry } from '$lib/renderers'
  import type { Capability } from '$lib/renderers'
  import LiveChanges from '$lib/LiveChanges.svelte'
  import type { QueryResult } from '@red-ui/protocol'
  import { X, Activity, Database, Plus } from 'lucide-svelte'

  const OVERRIDE_CHOICES: { value: '' | Capability; label: string }[] = [
    { value: '', label: 'Auto' },
    { value: 'table', label: 'Table' },
    { value: 'graph', label: 'Graph' },
    { value: 'hypertable', label: 'Chart' },
    { value: 'kv', label: 'KV' },
    { value: 'json', label: 'JSON' },
  ]

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
    tabs.close(id, previousActiveId)
    delete results[id]
    delete errors[id]
  }

  function pickRenderer(tab: Tab, result: QueryResult) {
    return registry.pick(tab.capability ?? (result.capability as any), result, tab.overrideCapability)
  }

  function openLiveChanges() {
    tabs.open({ kind: 'live-changes', label: 'live · global', key: 'global' })
    menuOpen = false
  }

  function onOverrideChange(tab: Tab, e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value as '' | Capability
    tabs.setOverride(tab.id, value === '' ? undefined : value)
  }

  function defaultCapabilityLabel(tab: Tab, result: QueryResult | null | undefined): string {
    if (tab.capability) return tab.capability
    if (result?.capability) return result.capability
    return 'auto'
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

    {#if tabs.active && (tabs.active.kind === 'collection' || tabs.active.kind === 'query')}
      {@const activeTab = tabs.active}
      {@const activeResult = results[activeTab.id]}
      <div class="ml-auto flex items-center gap-2 px-2 text-[11px] font-mono text-fg-3">
        <span>{defaultCapabilityLabel(activeTab, activeResult)}</span>
        <span class="text-fg-3">· override:</span>
        <select
          class="bg-bg-1 text-fg-1 border border-line-1 rounded px-1 py-0.5"
          aria-label="Renderer override"
          value={activeTab.overrideCapability ?? ''}
          onchange={(e) => onOverrideChange(activeTab, e)}
        >
          {#each OVERRIDE_CHOICES as choice (choice.value)}
            <option value={choice.value}>{choice.label}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="relative {tabs.active && (tabs.active.kind === 'collection' || tabs.active.kind === 'query') ? '' : 'ml-auto'} flex items-stretch">
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
