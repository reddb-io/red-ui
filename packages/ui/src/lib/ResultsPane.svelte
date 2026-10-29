<script lang="ts">
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  import { onMount, tick, untrack } from 'svelte'
  import { AlertDialog, DropdownMenu, Icon, NavigationScope, Select, Skeleton, ToggleButton } from '@reddb-io/design-system/base'
  import { WorkspaceTabs } from '@reddb-io/design-system/app'
  import { useRouter } from '$lib/router.svelte'

  import { type Tab } from '$lib/tabs.svelte'

  import { defaultSubpage, rendererSelection, subpageCapability } from '$lib/collection-pages'
  import { collectionPreviewQuery, safeCollectionName } from '$lib/collection-preview'
  import {
    collectionCatalogBadges,
    collectionCatalogFromRow,
    collectionCatalogQuery,
    formatBytes,
    formatCount,
    type CollectionCatalogMetadata,
  } from '$lib/collection-catalog'

  import type { Capability } from '$lib/renderers'
  import CollectionHistory from '$lib/CollectionHistory.svelte'
  import LiveChanges from '$lib/LiveChanges.svelte'
  import QueryEditor from '$lib/QueryEditor.svelte'
  import DisconnectedState from './DisconnectedState.svelte'
  import EmptyState from './EmptyState.svelte'
  import QueryFailure from './QueryFailure.svelte'
  import { projectEmpty } from '@reddb-io/design-system/base/illustrations'
  import type { CollectionMetadata, QueryResult, RedClient } from '#reddb'
  import Activity from '@lucide/svelte/icons/activity'
  import Database from '@lucide/svelte/icons/database'
  import Plus from '@lucide/svelte/icons/plus'
  import EyeOff from '@lucide/svelte/icons/eye-off'
  import Eye from '@lucide/svelte/icons/eye'
  import Info from '@lucide/svelte/icons/info'
  import HardDrive from '@lucide/svelte/icons/hard-drive'
  import Rows3 from '@lucide/svelte/icons/rows-3'
  import Layers3 from '@lucide/svelte/icons/layers-3'
  import ScanLine from '@lucide/svelte/icons/scan-line'
  import GitBranch from '@lucide/svelte/icons/git-branch'

  const workspace = useWorkspace()
  const { activity, connection, queryTabs, registry, secureStore, tabs } = workspace

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

  // Mount a renderer on first activation, then retain its local draft/filter state.
  // Restored inactive canvases must not initialize against a zero-size container.
  let mountedTabIds = $state<string[]>([])
  $effect(() => {
    const ids = tabs.tabs.map(tab => tab.id)
    const active = tabs.activeId
    untrack(() => {
      mountedTabIds = [...new Set([...mountedTabIds.filter(id => ids.includes(id)), ...(active ? [active] : [])])]
    })
  })

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
  let pane = $state<HTMLDivElement>()
  let closingDraft = $state<string | null>(null)
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
      const shouldFetchKv = subpage === 'kv' || tab.capability === 'kv'
      const fetchMode = shouldFetchGraph ? 'graph-subgraph' : shouldFetchQueue ? 'queue-peek' : shouldFetchVector ? 'vector-inspector' : shouldFetchStats ? 'stats-info' : shouldFetchKv ? 'kv-list' : tab.capability ?? 'unknown'
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
        : shouldFetchKv
          ? activity.track(
              `${collection} · LIST KV (LIMIT 200)`,
              () => client.query(collectionPreviewQuery(collection, 'kv')),
            )
        : activity.track(
            `${collection} · SELECT * (LIMIT 200)`,
            () => client.query(collectionPreviewQuery(collection, tab.capability)),
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

  function closeTab(id: string, confirmed = false) {
    const tab = tabs.tabs.find((t) => t.id === id)
    if (!confirmed && tab?.kind === 'query' && queryTabs.isDirty(id)) {
      closingDraft = id
      return
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

  async function discardDraft() {
    const id = closingDraft
    if (id) closeTab(id, true)
    closingDraft = null
    await tick()
    // The dialog's invoking close control was removed with the draft.
    // Return to the surviving document, or the action that opens a new one.
    const next = pane?.querySelector<HTMLElement>('[data-workspace-tab][aria-selected="true"]')
      ?? pane?.querySelector<HTMLElement>('[aria-label="Open tab menu"]')
    next?.focus()
  }

  function openNewQuery() {
    const label = queryTabs.nextLabel()
    const tab = tabs.open(
      { kind: 'query', label, key: label },
      true,
    )
    queryTabs.ensure(tab.id)
  }

  onMount(() => {
    const onNewQuery = () => openNewQuery()
    return workspace.on('red:new-query', onNewQuery)
  })

  function pickRenderer(tab: Tab, result: QueryResult) {
    const cap = subpageCapability(tab.subpage, tab.capability ?? (result.capability as Capability | undefined))
    // Empty results carry no shape evidence (the server can report "table"
    // even for an empty graph/queue). Keep the collection's selected view so
    // its own empty state renders instead of falling back to a blank table.
    const emptyCapability = result.ok && !result.result.records.length ? cap : undefined
    return registry.pick(cap, result, rendererSelection(tab.subpage, tab.overrideCapability, emptyCapability))
  }

  function openLiveChanges() {
    tabs.open({ kind: 'live-changes', label: 'live · global', key: 'global' })
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

<div bind:this={pane} class="h-full flex flex-col">
  <div class="border-b border-muted flex flex-wrap items-stretch min-h-[36px] bg-background">
    <span class="type-label px-3 py-2">Results</span>
    {#if tabs.active && (tabs.active.kind === 'collection' || tabs.active.kind === 'query')}
      {@const activeTab = tabs.active}
      {@const activeResult = results[activeTab.id]}
      <div class="ml-auto flex min-w-0 flex-wrap items-center gap-2 px-2 text-[11px] font-mono text-ink-muted">
        {#if activeTab.kind === 'collection'}
          <ToggleButton
            label="meta"
            onpressedchange={pressed => metadataOpen = pressed}
            title={metadataOpen ? 'Hide collection metadata' : 'Show collection metadata'}
            pressed={metadataOpen}
          >
            <DSIcon icon={Info} color="current" class="" />
            <span>meta</span>
          </ToggleButton>
          {#if connection.capabilities.vcs}
            <!-- VCS history is server-gated (#22): absent when the connected
                 server doesn't support version control, not shown-but-broken. -->
            <ToggleButton
              label="history"
              onpressedchange={pressed => historyOpen = { ...historyOpen, [activeTab.id]: pressed }}
              title={historyOpen[activeTab.id] ? 'Hide version history' : 'Show version history and diffs'}
              pressed={historyOpen[activeTab.id] ?? false}
              >
              <DSIcon icon={GitBranch} color="current" class="" />
              <span>history</span>
            </ToggleButton>
          {/if}
        {/if}
        <ToggleButton
          label="sys"
          onpressedchange={pressed => tabs.setShowSystem(activeTab.id, pressed)}
          title={activeTab.showSystemColumns ? 'Hide reddb system columns (rid, collection, kind, tenant, created_at, updated_at)' : 'Show reddb system columns'}
          pressed={activeTab.showSystemColumns ?? false}
        >
          {#if activeTab.showSystemColumns}
            <DSIcon icon={Eye} color="current" class="" />
          {:else}
            <DSIcon icon={EyeOff} color="current" class="" />
          {/if}
          <span>sys</span>
        </ToggleButton>
        <span>{defaultCapabilityLabel(activeTab, activeResult)}</span>
        <span class="text-ink-muted">· override:</span>
        <Select
          class="w-auto max-w-full"
          aria-label="Renderer override"
          value={activeTab.overrideCapability ?? ''}
          onchange={(e) => onOverrideChange(activeTab, e)}
        >
          {#each OVERRIDE_CHOICES as choice (choice.value)}
            <option value={choice.value}>{choice.label}</option>
          {/each}
        </Select>
      </div>
    {/if}

    <div class="ml-auto flex items-center px-2">
      <DropdownMenu triggerLabel="Open tab menu" contentLabel="Result tabs" variant="ghost" size="sm" align="end"
        items={[
          { id: 'query', label: 'New query', shortcut: ['⌘', 'T'], onselect: openNewQuery },
          { id: 'live', label: 'Live changes (global)', onselect: openLiveChanges },
        ]}>
        {#snippet trigger()}<Icon icon={Plus} size="sm" />{/snippet}
      </DropdownMenu>
    </div>
  </div>

  <NavigationScope navigate={href => {
    const tab = tabs.tabs.find(tab => tab.kind === 'collection' && router.href({ view: 'collection', collection: tab.key, subpage: tab.subpage ?? defaultSubpage(tab.capability) }) === href)
    if (tab) router.go({ view: 'collection', collection: tab.key, subpage: tab.subpage ?? defaultSubpage(tab.capability) })
  }}>
    {#if tabs.tabs.length}
      <WorkspaceTabs label="Open results" class="min-h-0 flex-1" panelClass="overflow-hidden bg-background p-0"
        items={tabs.tabs.map(tab => ({ id: tab.id, label: tab.label,
          dirty: tab.kind === 'query' && queryTabs.isDirty(tab.id),
          href: tab.kind === 'collection' ? router.href({ view: 'collection', collection: tab.key, subpage: tab.subpage ?? defaultSubpage(tab.capability) }) : undefined,
        }))} selected={tabs.activeId} onselectedchange={id => tabs.focus(id)} oncloserequest={id => closeTab(id)}>
        {#snippet children({ id })}
          {@const tab = tabs.tabs.find(tab => tab.id === id)}
          {#if tab && (id === tabs.activeId || mountedTabIds.includes(id))}<div class="h-full min-h-0 overflow-hidden">
      {#if tab.kind === 'live-changes'}
        <LiveChanges collection={undefined} />
      {:else if tab.kind === 'query'}
        <QueryEditor tabId={tab.id} fallbackLabel={tab.key} />
      {:else if tab.kind === 'welcome'}
        <div class="h-full grid place-items-center text-ink-muted text-[12px] font-mono">
          Workspace
        </div>
      {:else}
        {@const result = results[tab.id]}
        {@const err = errors[tab.id]}
        {#if err}
          <QueryFailure message={err} />
        {:else if !result}
          <div class="h-full min-h-0 p-[var(--reddb-spatial-inset-md)]" aria-busy="true" aria-label={`Loading ${tab.label} results`}>
            <Skeleton
              shape={tab.capability === 'graph' ? 'graph' : tab.capability === 'queue' ? 'list' : tab.capability === 'document' ? 'document' : 'table'}
              rows={14} columns={6} class="h-full"
            />
          </div>
        {:else}
          {@const renderer = pickRenderer(tab, result)}
          {@const Renderer = renderer.component}
          {@const catalog = catalogMetadata[tab.id]}
          {@const catalogErr = catalogErrors[tab.id]}
          <div class="h-full flex flex-col">
            <div class="border-b border-muted bg-elevation-base-surface/35 px-3 py-2">
              {#if catalogErr}
                <div class="flex items-center gap-2 text-[11px] font-mono text-ink-muted">
                  <DSIcon icon={Info} color="current" class=" text-feedback-warning-foreground" />
                  <span>Catalog metadata unavailable.</span>
                  <span class="truncate">{catalogErr}</span>
                </div>
              {:else if !catalog}
                <div class="flex items-center gap-2 text-[11px] font-mono text-ink-muted">
                  <DSIcon icon={Database} color="current" class="" />
                  <span>Loading collection catalog…</span>
                </div>
              {:else}
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div class="min-w-[180px] flex-1">
                    <div class="flex items-center gap-2">
                      <span class="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary-text">
                        {catalog.model ?? 'collection'}
                      </span>
                      <span class="truncate font-mono text-[12px] text-foreground">{catalog.name}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap gap-1">
                      {#each collectionCatalogBadges(catalog) as badge}
                        <span class="rounded border border-muted bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">{badge}</span>
                      {/each}
                      {#if collectionCatalogBadges(catalog).length === 0}
                        <span class="font-mono text-[10px] text-ink-muted">No type-specific catalog fields.</span>
                      {/if}
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <div class="inline-flex min-w-[94px] items-center gap-1.5 rounded border border-muted bg-background/70 px-2 py-1">
                      <DSIcon icon={Rows3} color="current" class=" text-ink-muted" />
                      <span class="text-foreground">{formatCount(catalog.entities)}</span>
                      <span class="text-ink-muted">entities</span>
                    </div>
                    <div class="inline-flex min-w-[92px] items-center gap-1.5 rounded border border-muted bg-background/70 px-2 py-1">
                      <DSIcon icon={HardDrive} color="current" class=" text-ink-muted" />
                      <span class="text-foreground">{formatBytes(catalog.onDiskBytes)}</span>
                      <span class="text-ink-muted">disk</span>
                    </div>
                    <div class="inline-flex min-w-[92px] items-center gap-1.5 rounded border border-muted bg-background/70 px-2 py-1">
                      <DSIcon icon={Activity} color="current" class=" text-ink-muted" />
                      <span class="text-foreground">{formatBytes(catalog.inMemoryBytes)}</span>
                      <span class="text-ink-muted">mem</span>
                    </div>
                    <div class="inline-flex min-w-[78px] items-center gap-1.5 rounded border border-muted bg-background/70 px-2 py-1">
                      <DSIcon icon={Layers3} color="current" class=" text-ink-muted" />
                      <span class="text-foreground">{formatCount(catalog.segments)}</span>
                      <span class="text-ink-muted">seg</span>
                    </div>
                    <div class="inline-flex min-w-[78px] items-center gap-1.5 rounded border border-muted bg-background/70 px-2 py-1">
                      <DSIcon icon={ScanLine} color="current" class=" text-ink-muted" />
                      <span class="text-foreground">{formatCount(catalog.indices)}</span>
                      <span class="text-ink-muted">idx</span>
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            {#if metadataOpen}
              {@const meta = metadata[tab.id]}
              {@const metaErr = metadataErrors[tab.id]}
              <div class="border-b border-muted bg-elevation-base-surface/30 px-3 py-2 text-[11px] font-mono">
                {#if metaErr}
                  <div class="flex items-start gap-2 text-ink-muted">
                    <DSIcon icon={Info} color="current" class="mt-0.5  text-feedback-warning-foreground" />
                    <div>
                      <div class="text-feedback-warning-foreground">Collection metadata unavailable.</div>
                      <div class="mt-0.5 break-words">{metaErr}</div>
                    </div>
                  </div>
                {:else if !meta}
                  <div class="text-ink-muted">Loading metadata…</div>
                {:else}
                  <div class="grid grid-cols-[minmax(160px,0.8fr)_1.2fr] gap-3">
                    <div class="grid grid-cols-[78px_1fr] gap-x-2 gap-y-1">
                      <span class="text-ink-muted">name</span>
                      <span class="text-foreground truncate">{meta.name ?? tab.key}</span>
                      <span class="text-ink-muted">kind</span>
                      <span class="text-primary-text">{meta.kind ?? meta.capability ?? tab.capability ?? 'unknown'}</span>
                      <span class="text-ink-muted">tenant</span>
                      <span class="text-foreground">{meta.tenant ?? 'not exposed'}</span>
                      <span class="text-ink-muted">indexes</span>
                      <span class="text-foreground">{meta.indexes?.length ?? 0}</span>
                    </div>

                    <div class="grid gap-1">
                      <div class="flex flex-wrap gap-1">
                        {#if meta.capability}
                          <span class="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary-text">{meta.capability}</span>
                        {/if}
                        {#each meta.capabilities ?? [] as cap}
                          <span class="rounded border border-muted px-1.5 py-0.5 text-ink-muted">{cap}</span>
                        {/each}
                        {#if objectKeys(meta.schema).length > 0}
                          <span class="rounded border border-muted px-1.5 py-0.5 text-ink-muted">schema {objectKeys(meta.schema).length}</span>
                        {/if}
                        {#if objectKeys(meta.retention).length > 0}
                          <span class="rounded border border-muted px-1.5 py-0.5 text-ink-muted">retention</span>
                        {/if}
                      </div>

                      {#if meta.actions && objectKeys(meta.actions).length > 0}
                        <div class="mt-1 flex flex-wrap gap-1">
                          {#each Object.entries(meta.actions) as [action, value]}
                            {@const state = actionAllowed(value)}
                            <span
                              class={[
                                'rounded border px-1.5 py-0.5',
                                state.allowed ? 'border-ok/30 bg-feedback-success-fill/10 text-feedback-success-foreground' : 'border-feedback-danger-border/30 bg-feedback-danger-fill/10 text-feedback-danger-foreground',
                              ].join(' ')}
                              title={state.reason}
                            >
                              {action}: {state.allowed ? 'allow' : 'deny'}
                            </span>
                          {/each}
                        </div>
                      {:else}
                        <div class="mt-1 text-ink-muted">Action grants not exposed.</div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
            {#if historyOpen[tab.id]}
              <div class="h-[320px] min-h-[240px] border-b border-muted">
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
          </div>{/if}
        {/snippet}
      </WorkspaceTabs>
    {:else}
      <div class="min-h-0 flex-1 overflow-hidden bg-background">
      <div class="h-full grid place-items-center p-6">
        {#if connection.connected}
          <EmptyState illustration={projectEmpty} illustrationSize="lg" title="Choose a collection" message="Your database is connected. Pick a collection from the schema browser to inspect its data." />
        {:else}
          <DisconnectedState />
        {/if}
      </div>
      </div>
    {/if}
  </NavigationScope>
</div>
<AlertDialog title="Discard unsaved query in this tab?" confirmLabel="Discard and close"
  open={closingDraft !== null} onopenchange={next => { if (!next) closingDraft = null }}
  onconfirm={discardDraft} />
