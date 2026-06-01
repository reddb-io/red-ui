<script lang="ts">
  import { onMount } from 'svelte'
  import { useRouter } from '$lib/router.svelte'
  import { connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import { activity } from '$lib/activity.svelte'
  import { tabs, type Tab } from '$lib/tabs.svelte'
  import { queryTabs } from '$lib/query-tabs.svelte'
  import { defaultSubpage, subpageCapability } from '$lib/collection-pages'
  import {
    collectionCatalogBadges,
    collectionCatalogFromRow,
    collectionCatalogQuery,
    formatBytes,
    formatCount,
    type CollectionCatalogMetadata,
  } from '$lib/collection-catalog'
  import { registry } from '$lib/renderers'
  import type { Capability } from '$lib/renderers'
  import CollectionHistory from '$lib/CollectionHistory.svelte'
  import LiveChanges from '$lib/LiveChanges.svelte'
  import QueryEditor from '$lib/QueryEditor.svelte'
  import type { CollectionMetadata, QueryResult, RedClient } from '#reddb'
  import { X, Activity, Database, Plus, FileCode2, EyeOff, Eye, Info, HardDrive, Rows3, Layers3, ScanLine, GitBranch } from 'lucide-svelte'

  const router = useRouter()

  const OVERRIDE_CHOICES: { value: '' | Capability; label: string }[] = [
    { value: '', label: 'Auto' },
    { value: 'table', label: 'Table' },
    { value: 'graph', label: 'Graph' },
    { value: 'hypertable', label: 'Chart' },
    { value: 'kv', label: 'KV' },
    { value: 'vector', label: 'Vector' },
    { value: 'queue', label: 'Queue' },
    { value: 'stats', label: 'Stats' },
    { value: 'diff', label: 'Diff' },
    { value: 'document', label: 'Document' },
    { value: 'json', label: 'JSON' },
  ]

  let results = $state<Record<string, QueryResult | null>>({})
  let errors = $state<Record<string, string>>({})
  let resultKeys = $state<Record<string, string>>({})
  let catalogMetadata = $state<Record<string, CollectionCatalogMetadata | null>>({})
  let catalogErrors = $state<Record<string, string>>({})
  let metadata = $state<Record<string, CollectionMetadata | null>>({})
  let metadataErrors = $state<Record<string, string>>({})
  let historyOpen = $state<Record<string, boolean>>({})
  let previousActiveId = $state<string | null>(null)
  let lastActiveId: string | null = null
  let menuOpen = $state(false)
  let metadataOpen = $state(false)

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
    const EDGE_LIMIT = 50000
    const CENTRALITY_LIMIT = 100
    // reddb's WHERE rid IN (…) silently returns 0 once the list size
    // exceeds a small threshold (somewhere around 8 in 1.3.0). Chunk to
    // stay safely under that ceiling and union the results.
    const IN_CHUNK = 5
    // Run node-batch queries in parallel but bounded so we don't slam the
    // server. 8 concurrent fits ~1k batches in roughly a second.
    const CONCURRENCY = 8

    const [edgesRes, centralityRes] = await Promise.all([
      activity.track(
        `${collection} · edges (LIMIT ${EDGE_LIMIT})`,
        () => client.query(
          `SELECT * FROM ${collection} WHERE from_rid IS NOT NULL LIMIT ${EDGE_LIMIT}`,
        ),
      ),
      activity.track(
        `${collection} · centrality (LIMIT ${CENTRALITY_LIMIT})`,
        () => client.query(`GRAPH CENTRALITY LIMIT ${CENTRALITY_LIMIT}`),
      ).catch(() => null),
    ])

    const centralityByRid = new Map<number, { score: number; rank: number; label?: string }>()
    if (centralityRes?.ok) {
      centralityRes.result.records.forEach((rec, index) => {
        const rawId = rec.values.node_id ?? rec.values.rid ?? rec.values.id
        const rawScore = rec.values.score ?? rec.values.centrality_score ?? rec.values.centrality
        const id = typeof rawId === 'number' ? rawId : typeof rawId === 'string' ? Number(rawId) : NaN
        const score = typeof rawScore === 'number' ? rawScore : typeof rawScore === 'string' ? Number(rawScore) : NaN
        if (!Number.isFinite(id) || !Number.isFinite(score)) return
        centralityByRid.set(id, {
          score,
          rank: index + 1,
          label: typeof rec.values.label === 'string' ? rec.values.label : undefined,
        })
      })
    }

    const rids = new Set<number>()
    for (const rec of edgesRes.result.records) {
      const f = rec.values.from_rid
      const t = rec.values.to_rid
      if (typeof f === 'number') rids.add(f)
      if (typeof t === 'number') rids.add(t)
    }
    for (const rid of centralityByRid.keys()) rids.add(rid)

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
        nodeRecords.push(...r.result.records.map((rec) => {
          const rid = rec.values.rid
          const centrality = typeof rid === 'number' ? centralityByRid.get(rid) : undefined
          if (!centrality) return rec
          return {
            ...rec,
            values: {
              ...rec.values,
              centrality_score: centrality.score,
              centrality_rank: centrality.rank,
              centrality_label: centrality.label,
            },
          }
        }))
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

  function safeCollectionName(collection: string): string {
    return collection.replace(/[^A-Za-z0-9_./-]/g, '')
  }

  function sqlString(s: string): string {
    return `'${s.replace(/'/g, "''")}'`
  }

  async function fetchCollectionCatalog(client: RedClient, collection: string): Promise<CollectionCatalogMetadata> {
    const r = await client.query(collectionCatalogQuery(collection))
    const meta = collectionCatalogFromRow(r.result.records[0])
    if (!meta) throw new Error(`${collection} was not found in red.collections`)
    return meta
  }

  async function fetchCollectionModel(client: RedClient, collection: string): Promise<string | null> {
    try {
      const r = await client.query(`SELECT model FROM red.collections WHERE name = ${sqlString(collection)} LIMIT 1`)
      const model = r.result.records[0]?.values.model
      return typeof model === 'string' ? model : null
    } catch {
      return null
    }
  }

  async function fetchStatsCollection(client: RedClient, collection: string) {
    const safe = safeCollectionName(collection)
    const model = await fetchCollectionModel(client, collection)
    if (model === 'hll') return client.query(`HLL INFO ${safe}`)
    if (model === 'sketch') return client.query(`SKETCH INFO ${safe}`)
    if (model === 'filter') return client.query(`FILTER INFO ${safe}`)
    if (model === 'mixed') {
      for (const query of [`HLL INFO ${safe}`, `SKETCH INFO ${safe}`, `FILTER INFO ${safe}`]) {
        try {
          return await client.query(query)
        } catch {
          // Try the next probabilistic read form before falling back to SELECT.
        }
      }
    }
    try {
      return await client.query(`SELECT * FROM ${safe} LIMIT 200`)
    } catch {
      for (const query of [`HLL INFO ${safe}`, `SKETCH INFO ${safe}`, `FILTER INFO ${safe}`]) {
        try {
          return await client.query(query)
        } catch {
          // Try the next probabilistic read form.
        }
      }
      throw new Error(`No stats read form worked for ${collection}`)
    }
  }

  async function fetchVectorSeed(client: RedClient, collection: string) {
    const safe = safeCollectionName(collection)
    const r = await client.query(`SELECT * FROM ${safe} LIMIT 200`)
    return { ...r, capability: r.capability ?? 'vector' }
  }

  $effect(() => {
    if (secureStore.locked) return
    const client = connection.client
    if (!client) return
    for (const tab of tabs.tabs) {
      if (tab.kind !== 'collection') continue
      const subpage = tab.subpage ?? defaultSubpage(tab.capability)
      const shouldFetchGraph = subpage === 'graph' || subpage === 'svg'
      const shouldFetchQueue = subpage === 'queue' || tab.capability === 'queue'
      const shouldFetchVector = subpage === 'vector' || tab.capability === 'vector'
      const shouldFetchStats = subpage === 'stats' || tab.capability === 'stats'
      const fetchMode = shouldFetchGraph ? 'graph-subgraph' : shouldFetchQueue ? 'queue-peek' : shouldFetchVector ? 'vector-inspector' : shouldFetchStats ? 'stats-info' : tab.capability ?? 'unknown'
      const cacheKey = `${tab.key}:${subpage}:${fetchMode}`
      if (resultKeys[tab.id] && resultKeys[tab.id] !== cacheKey) {
        delete results[tab.id]
        delete errors[tab.id]
      }
      if (results[tab.id] !== undefined || errors[tab.id]) continue
      results[tab.id] = null
      resultKeys[tab.id] = cacheKey
      const collection = tab.key
      const job = shouldFetchGraph
        ? fetchGraphSubgraph(client, collection)
        : shouldFetchQueue
          ? activity.track(
              `${collection} · QUEUE PEEK (LIMIT 200)`,
              () => client.query(`QUEUE PEEK ${collection} 200`),
            )
        : shouldFetchVector
          ? activity.track(
              `${collection} · vector inspector seed`,
              () => fetchVectorSeed(client, collection),
            )
        : shouldFetchStats
          ? activity.track(
              `${collection} · stats preview`,
              () => fetchStatsCollection(client, collection),
            )
        : activity.track(
            `${collection} · SELECT * (LIMIT 200)`,
            () => client.query(`SELECT * FROM ${collection} LIMIT 200`),
          )
      job
        .then((r) => { results[tab.id] = r })
        .catch((e) => { errors[tab.id] = (e as Error).message })
    }
  })

  $effect(() => {
    if (secureStore.locked) return
    const client = connection.client
    if (!client) return
    for (const tab of tabs.tabs) {
      if (tab.kind !== 'collection') continue
      if (catalogMetadata[tab.id] !== undefined || catalogErrors[tab.id]) continue
      catalogMetadata[tab.id] = null
      activity.track(`catalog · ${tab.key}`, () => fetchCollectionCatalog(client, tab.key))
        .then((m) => { catalogMetadata[tab.id] = m })
        .catch((e) => { catalogErrors[tab.id] = (e as Error).message })
    }
  })

  $effect(() => {
    if (!metadataOpen) return
    if (secureStore.locked) return
    const client = connection.client
    if (!client) return
    for (const tab of tabs.tabs) {
      if (tab.kind !== 'collection') continue
      if (metadata[tab.id] !== undefined || metadataErrors[tab.id]) continue
      metadata[tab.id] = null
      activity.track(`metadata · ${tab.key}`, () => client.collection(tab.key))
        .then((m) => { metadata[tab.id] = m })
        .catch((e) => { metadataErrors[tab.id] = (e as Error).message })
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
    const closingUrlOwner = tab?.kind === 'collection' && tab.key === router.collection
    tabs.close(id, previousActiveId)
    queryTabs.remove(id)
    delete results[id]
    delete errors[id]
    delete resultKeys[id]
    delete catalogMetadata[id]
    delete catalogErrors[id]
    delete metadata[id]
    delete metadataErrors[id]
    delete historyOpen[id]
    if (closingUrlOwner) {
      const next = tabs.tabs.find((t) => t.kind === 'collection')
      router.go(
        next
          ? { view: 'collection', collection: next.key, subpage: next.subpage ?? defaultSubpage(next.capability) }
          : { view: 'collections' },
        undefined,
        true,
      )
    }
  }

  function openNewQuery() {
    const label = queryTabs.nextLabel()
    const tab = tabs.open(
      { kind: 'query', label, key: label },
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
    const cap = subpageCapability(tab.subpage, tab.capability ?? (result.capability as Capability | undefined))
    return registry.pick(cap, result, tab.overrideCapability)
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
    if (tab.subpage) return tab.subpage
    if (tab.capability) return tab.capability
    if (result?.capability) return result.capability
    return 'auto'
  }

  function actionAllowed(v: NonNullable<CollectionMetadata['actions']>[string]): { allowed: boolean; reason?: string } {
    if (typeof v === 'boolean') return { allowed: v }
    return { allowed: v.allowed, reason: v.reason }
  }

  function objectKeys(v: unknown): string[] {
    return v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v as Record<string, unknown>) : []
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
            {@const tabTarget = { view: 'collection' as const, collection: tab.key, subpage: tab.subpage ?? defaultSubpage(tab.capability) }}
            <a href={router.href(tabTarget)} onclick={(e) => router.go(tabTarget, e)} class={cls} title={tab.label}>
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
        {#if activeTab.kind === 'collection'}
          <button
            type="button"
            onclick={() => (metadataOpen = !metadataOpen)}
            title={metadataOpen ? 'Hide collection metadata' : 'Show collection metadata'}
            aria-pressed={metadataOpen}
            class={[
              'inline-flex items-center gap-1 h-6 px-1.5 rounded border transition-colors cursor-pointer',
              metadataOpen
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2',
            ].join(' ')}
          >
            <Info class="size-3" />
            <span>meta</span>
          </button>
          {#if connection.capabilities.vcs}
            <!-- VCS history is server-gated (#22): absent when the connected
                 server doesn't support version control, not shown-but-broken. -->
            <button
              type="button"
              onclick={() => (historyOpen = { ...historyOpen, [activeTab.id]: !(historyOpen[activeTab.id] ?? false) })}
              title={historyOpen[activeTab.id] ? 'Hide version history' : 'Show version history and diffs'}
              aria-pressed={historyOpen[activeTab.id] ?? false}
              class={[
                'inline-flex items-center gap-1 h-6 px-1.5 rounded border transition-colors cursor-pointer',
                historyOpen[activeTab.id]
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2',
              ].join(' ')}
            >
              <GitBranch class="size-3" />
              <span>history</span>
            </button>
          {/if}
        {/if}
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
          {@const catalog = catalogMetadata[tab.id]}
          {@const catalogErr = catalogErrors[tab.id]}
          <div class="h-full flex flex-col">
            <div class="border-b border-line-1 bg-bg-1/35 px-3 py-2">
              {#if catalogErr}
                <div class="flex items-center gap-2 text-[11px] font-mono text-fg-3">
                  <Info class="size-3.5 text-warn" />
                  <span>Catalog metadata unavailable.</span>
                  <span class="truncate">{catalogErr}</span>
                </div>
              {:else if !catalog}
                <div class="flex items-center gap-2 text-[11px] font-mono text-fg-3">
                  <Database class="size-3.5" />
                  <span>Loading collection catalog…</span>
                </div>
              {:else}
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div class="min-w-[180px] flex-1">
                    <div class="flex items-center gap-2">
                      <span class="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                        {catalog.model ?? 'collection'}
                      </span>
                      <span class="truncate font-mono text-[12px] text-fg-0">{catalog.name}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap gap-1">
                      {#each collectionCatalogBadges(catalog) as badge}
                        <span class="rounded border border-line-1 bg-bg-0/70 px-1.5 py-0.5 font-mono text-[10px] text-fg-2">{badge}</span>
                      {/each}
                      {#if collectionCatalogBadges(catalog).length === 0}
                        <span class="font-mono text-[10px] text-fg-3">No type-specific catalog fields.</span>
                      {/if}
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <div class="inline-flex min-w-[94px] items-center gap-1.5 rounded border border-line-1 bg-bg-0/70 px-2 py-1">
                      <Rows3 class="size-3.5 text-fg-3" />
                      <span class="text-fg-0">{formatCount(catalog.entities)}</span>
                      <span class="text-fg-3">entities</span>
                    </div>
                    <div class="inline-flex min-w-[92px] items-center gap-1.5 rounded border border-line-1 bg-bg-0/70 px-2 py-1">
                      <HardDrive class="size-3.5 text-fg-3" />
                      <span class="text-fg-0">{formatBytes(catalog.onDiskBytes)}</span>
                      <span class="text-fg-3">disk</span>
                    </div>
                    <div class="inline-flex min-w-[92px] items-center gap-1.5 rounded border border-line-1 bg-bg-0/70 px-2 py-1">
                      <Activity class="size-3.5 text-fg-3" />
                      <span class="text-fg-0">{formatBytes(catalog.inMemoryBytes)}</span>
                      <span class="text-fg-3">mem</span>
                    </div>
                    <div class="inline-flex min-w-[78px] items-center gap-1.5 rounded border border-line-1 bg-bg-0/70 px-2 py-1">
                      <Layers3 class="size-3.5 text-fg-3" />
                      <span class="text-fg-0">{formatCount(catalog.segments)}</span>
                      <span class="text-fg-3">seg</span>
                    </div>
                    <div class="inline-flex min-w-[78px] items-center gap-1.5 rounded border border-line-1 bg-bg-0/70 px-2 py-1">
                      <ScanLine class="size-3.5 text-fg-3" />
                      <span class="text-fg-0">{formatCount(catalog.indices)}</span>
                      <span class="text-fg-3">idx</span>
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            {#if metadataOpen}
              {@const meta = metadata[tab.id]}
              {@const metaErr = metadataErrors[tab.id]}
              <div class="border-b border-line-1 bg-bg-1/30 px-3 py-2 text-[11px] font-mono">
                {#if metaErr}
                  <div class="flex items-start gap-2 text-fg-3">
                    <Info class="mt-0.5 size-3.5 text-warn" />
                    <div>
                      <div class="text-warn">Collection metadata unavailable.</div>
                      <div class="mt-0.5 break-words">{metaErr}</div>
                    </div>
                  </div>
                {:else if !meta}
                  <div class="text-fg-3">Loading metadata…</div>
                {:else}
                  <div class="grid grid-cols-[minmax(160px,0.8fr)_1.2fr] gap-3">
                    <div class="grid grid-cols-[78px_1fr] gap-x-2 gap-y-1">
                      <span class="text-fg-3">name</span>
                      <span class="text-fg-0 truncate">{meta.name ?? tab.key}</span>
                      <span class="text-fg-3">kind</span>
                      <span class="text-accent">{meta.kind ?? meta.capability ?? tab.capability ?? 'unknown'}</span>
                      <span class="text-fg-3">tenant</span>
                      <span class="text-fg-1">{meta.tenant ?? 'not exposed'}</span>
                      <span class="text-fg-3">indexes</span>
                      <span class="text-fg-1">{meta.indexes?.length ?? 0}</span>
                    </div>

                    <div class="grid gap-1">
                      <div class="flex flex-wrap gap-1">
                        {#if meta.capability}
                          <span class="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-accent">{meta.capability}</span>
                        {/if}
                        {#each meta.capabilities ?? [] as cap}
                          <span class="rounded border border-line-1 px-1.5 py-0.5 text-fg-2">{cap}</span>
                        {/each}
                        {#if objectKeys(meta.schema).length > 0}
                          <span class="rounded border border-line-1 px-1.5 py-0.5 text-fg-2">schema {objectKeys(meta.schema).length}</span>
                        {/if}
                        {#if objectKeys(meta.retention).length > 0}
                          <span class="rounded border border-line-1 px-1.5 py-0.5 text-fg-2">retention</span>
                        {/if}
                      </div>

                      {#if meta.actions && objectKeys(meta.actions).length > 0}
                        <div class="mt-1 flex flex-wrap gap-1">
                          {#each Object.entries(meta.actions) as [action, value]}
                            {@const state = actionAllowed(value)}
                            <span
                              class={[
                                'rounded border px-1.5 py-0.5',
                                state.allowed ? 'border-ok/30 bg-ok/10 text-ok' : 'border-danger/30 bg-danger/10 text-danger',
                              ].join(' ')}
                              title={state.reason}
                            >
                              {action}: {state.allowed ? 'allow' : 'deny'}
                            </span>
                          {/each}
                        </div>
                      {:else}
                        <div class="mt-1 text-fg-3">Action grants not exposed.</div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
            {#if historyOpen[tab.id]}
              <div class="h-[320px] min-h-[240px] border-b border-line-1">
                <CollectionHistory client={connection.client ?? undefined} collection={tab.key} />
              </div>
            {/if}
            <div class="flex-1 min-h-0">
              <Renderer
                {result}
                collection={tab.kind === 'collection' ? tab.key : undefined}
                client={connection.client ?? undefined}
                subpage={tab.kind === 'collection' ? tab.subpage : undefined}
                showSystem={tab.showSystemColumns ?? false}
              />
            </div>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>
