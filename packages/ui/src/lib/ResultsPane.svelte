<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import { activity } from '$lib/activity.svelte'
  import { tabs, type Tab } from '$lib/tabs.svelte'
  import { queryTabs } from '$lib/query-tabs.svelte'
  import { registry } from '$lib/renderers'
  import type { Capability } from '$lib/renderers'
  import LiveChanges from '$lib/LiveChanges.svelte'
  import QueryEditor from '$lib/QueryEditor.svelte'
  import type { QueryResult, RedClient } from '@red-ui/protocol'
  import { X, Activity, Database, Plus, FileCode2, EyeOff, Eye } from 'lucide-svelte'

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

  /**
   * Fetch a meaningful sub-graph: pull a window of edges first, then the
   * nodes those edges actually reference (plus a few unconnected ones for
   * context). A flat `SELECT *` on a CREATE GRAPH collection returns
   * nodes-then-edges in insertion order, so without this split the first
   * N rows are all nodes and zero edges land in the renderer.
   */
  async function fetchGraphSubgraph(client: RedClient, collection: string) {
    const EDGE_LIMIT = 5000
    // reddb's WHERE rid IN (…) silently returns 0 once the list size
    // exceeds a small threshold (somewhere around 8 in 1.3.0). Chunk to
    // stay safely under that ceiling and union the results.
    const IN_CHUNK = 5
    // Run node-batch queries in parallel but bounded so we don't slam the
    // server. 8 concurrent fits ~1k batches in roughly a second.
    const CONCURRENCY = 8

    const edgesRes = await activity.track(
      `${collection} · edges (LIMIT ${EDGE_LIMIT})`,
      () => client.query(
        `SELECT * FROM ${collection} WHERE from_rid IS NOT NULL LIMIT ${EDGE_LIMIT}`,
      ),
    )
    const rids = new Set<number>()
    for (const rec of edgesRes.result.records) {
      const f = rec.values.from_rid
      const t = rec.values.to_rid
      if (typeof f === 'number') rids.add(f)
      if (typeof t === 'number') rids.add(t)
    }

    const ridList = [...rids]
    const totalChunks = Math.ceil(ridList.length / IN_CHUNK)
    const chunks: { idx: number; ids: string }[] = []
    for (let i = 0; i < ridList.length; i += IN_CHUNK) {
      chunks.push({
        idx: Math.floor(i / IN_CHUNK) + 1,
        ids: ridList.slice(i, i + IN_CHUNK).join(','),
      })
    }

    const nodeRecords: typeof edgesRes.result.records = []
    let nodesRes = edgesRes // template for shape

    // Bounded-concurrency worker pool. Each worker pulls the next chunk
    // off the shared cursor; that pattern keeps CONCURRENCY requests in
    // flight without spawning a Promise per chunk up-front.
    let cursor = 0
    async function worker() {
      while (cursor < chunks.length) {
        const my = chunks[cursor++]
        const r = await activity.track(
          `${collection} · nodes ${my.idx}/${totalChunks}`,
          () => client.query(`SELECT * FROM ${collection} WHERE rid IN (${my.ids})`),
        )
        nodeRecords.push(...r.result.records)
        nodesRes = r
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))

    return {
      ...nodesRes,
      record_count: nodeRecords.length + edgesRes.result.records.length,
      result: {
        ...nodesRes.result,
        records: [...nodeRecords, ...edgesRes.result.records],
      },
    }
  }

  $effect(() => {
    if (secureStore.locked) return
    const client = connection.client
    if (!client) return
    for (const tab of tabs.tabs) {
      if (results[tab.id] !== undefined || errors[tab.id]) continue
      if (tab.kind !== 'collection') continue
      results[tab.id] = null
      const collection = tab.key
      const job = tab.capability === 'graph'
        ? fetchGraphSubgraph(client, collection)
        : activity.track(
            `${collection} · SELECT * (LIMIT 200)`,
            () => client.query(`SELECT * FROM ${collection} LIMIT 200`),
          )
      job
        .then((r) => { results[tab.id] = r })
        .catch((e) => { errors[tab.id] = (e as Error).message })
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
    // If we're closing the collection that owns the current URL, the
    // /c/[collection] route would just re-open the tab on every render.
    // Navigate away so the URL stays in sync with what's open.
    const closingUrlOwner = tab?.kind === 'collection' && tab.key === page.params.collection
    tabs.close(id, previousActiveId)
    queryTabs.remove(id)
    delete results[id]
    delete errors[id]
    if (closingUrlOwner) {
      const next = tabs.tabs.find((t) => t.kind === 'collection')
      goto(next ? `/c/${encodeURIComponent(next.key)}` : '/', { replaceState: true })
    }
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
          {@const cls = [
            'group flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono border-r border-line-1 whitespace-nowrap no-underline',
            isActive
              ? 'bg-bg-1 text-fg-1 border-b-2 border-b-accent -mb-px'
              : 'text-fg-3 hover:text-fg-1 hover:bg-bg-1/40',
          ].join(' ')}
          {#if tab.kind === 'collection'}
            <a href="/c/{encodeURIComponent(tab.key)}" class={cls} title={tab.label}>
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
            </a>
          {:else}
            <button type="button" class={cls} onclick={() => tabs.focus(tab.id)} title={tab.label}>
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
          {/if}
        {/each}
      </div>
    {/if}

    {#if tabs.active && (tabs.active.kind === 'collection' || tabs.active.kind === 'query')}
      {@const activeTab = tabs.active}
      {@const activeResult = results[activeTab.id]}
      <div class="ml-auto flex items-center gap-2 px-2 text-[11px] font-mono text-fg-3">
        <button
          type="button"
          onclick={() => tabs.setShowSystem(activeTab.id, !activeTab.showSystemColumns)}
          title={activeTab.showSystemColumns ? 'Hide reddb system columns (rid, collection, kind, tenant, created_at, updated_at)' : 'Show reddb system columns'}
          aria-pressed={activeTab.showSystemColumns ?? false}
          class={[
            'inline-flex items-center gap-1 h-6 px-1.5 rounded border transition-colors cursor-pointer',
            activeTab.showSystemColumns
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2',
          ].join(' ')}
        >
          {#if activeTab.showSystemColumns}
            <Eye class="size-3" />
          {:else}
            <EyeOff class="size-3" />
          {/if}
          <span>sys</span>
        </button>
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
          <Renderer
            {result}
            collection={tab.kind === 'collection' ? tab.key : undefined}
            showSystem={tab.showSystemColumns ?? false}
          />
        {/if}
      {/if}
    {/if}
  </div>
</div>
