<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { onMount, onDestroy } from 'svelte'
  import Sigma from 'sigma'
  import Graph from 'graphology'
  import forceAtlas2 from 'graphology-layout-forceatlas2'
  import { extractGraph, type GraphNode, type GraphEdge } from './graph-render'
  import { connection } from '$lib/connections.svelte'
  import { activity } from '$lib/activity.svelte'
  import { Network, Table2, Search, X, Info, Maximize2, Play, Code2, RotateCw, Loader2 } from 'lucide-svelte'

  interface Props {
    result: QueryResult
    collection?: string
    showSystem?: boolean
  }

  let { result, collection }: Props = $props()

  // ─── data ───────────────────────────────────────────────────────────────
  let overrideResult = $state<QueryResult | null>(null)
  const activeResult = $derived(overrideResult ?? result)
  const graph = $derived(extractGraph(activeResult))

  // ─── view state ─────────────────────────────────────────────────────────
  let viewMode = $state<'canvas' | 'table'>('canvas')
  let canvasLimit = $state(10000)
  let labelFilter = $state('')
  let selectedNode = $state<GraphNode | null>(null)
  let selectedEdge = $state<GraphEdge | null>(null)

  // ─── query toolbar state ────────────────────────────────────────────────
  let queryOpen = $state(false)
  let queryText = $state('')
  let querying = $state(false)
  let queryError = $state<string | null>(null)

  async function runQuery(q: string) {
    const client = connection.client
    if (!client || !q.trim()) return
    querying = true
    queryError = null
    try {
      const r = await activity.track(
        `${collection ?? 'graph'} · query (${q.slice(0, 40).replace(/\s+/g, ' ')}…)`,
        () => client.query(q),
      )
      if (!r.ok) {
        queryError = r.error ?? 'query failed'
        return
      }
      overrideResult = r
      selectedNode = null
      selectedEdge = null
    } catch (e) {
      queryError = (e as Error).message
    } finally {
      querying = false
    }
  }

  function resetToOriginal() {
    overrideResult = null
    queryText = ''
    queryError = null
    selectedNode = null
    selectedEdge = null
  }

  function quickNeighborhood() {
    if (!selectedNode) return
    queryText = `GRAPH NEIGHBORHOOD '${selectedNode.label}' DEPTH 1`
    queryOpen = true
    runQuery(queryText)
  }

  function quickCentrality() {
    queryText = `GRAPH CENTRALITY LIMIT 50`
    queryOpen = true
    runQuery(queryText)
  }

  // ─── node-type filter ───────────────────────────────────────────────────
  const availableTypes = $derived.by(() => {
    const counts = new Map<string, number>()
    for (const n of graph.nodes) {
      const t = String(n.data.node_type ?? 'node')
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  })

  let hiddenTypes = $state<Set<string>>(new Set())

  const filteredNodes = $derived.by(() => {
    const q = labelFilter.trim().toLowerCase()
    return graph.nodes.filter((n) => {
      const type = String(n.data.node_type ?? 'node')
      if (hiddenTypes.has(type)) return false
      if (!q) return true
      return n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
    })
  })

  const drawNodes = $derived(filteredNodes.slice(0, canvasLimit))
  const drawNodeIds = $derived(new Set(drawNodes.map((n) => n.id)))
  const drawEdges = $derived(
    graph.edges.filter((e) => drawNodeIds.has(e.source) && drawNodeIds.has(e.target)),
  )

  const truncated = $derived(filteredNodes.length > canvasLimit)

  function toggleType(t: string) {
    const next = new Set(hiddenTypes)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    hiddenTypes = next
  }

  // ─── colors per node_type (Sigma needs literal hex/rgb at draw time) ────
  // Pulled from the theme tokens manually; Sigma's WebGL renderer can't
  // read CSS vars at draw time so we hardcode the equivalent values.
  function colorForType(type: string): string {
    switch (type) {
      case 'tale':      return '#ff2056' // accent
      case 'character': return '#7dd3fc' // sky-300
      case 'location':  return '#a3e635' // lime-400
      case 'object':    return '#fbbf24' // amber-400
      case 'archetype': return '#a78bfa' // violet-400
      default:          return '#94a3b8' // slate-400
    }
  }

  function sizeForType(type: string): number {
    if (type === 'tale') return 8
    if (type === 'character') return 5
    if (type === 'location' || type === 'object') return 4
    return 3
  }

  // ─── Sigma + Graphology canvas ──────────────────────────────────────────
  let canvasEl: HTMLDivElement | undefined = $state()
  let sigmaInstance: Sigma | null = null

  function buildGraphology(): Graph {
    const g = new Graph({ multi: true, type: 'directed' })
    // Seed with random positions; ForceAtlas2 needs non-zero starting coords.
    for (const n of drawNodes) {
      const type = String(n.data.node_type ?? 'node')
      g.addNode(n.id, {
        x: Math.random(),
        y: Math.random(),
        size: sizeForType(type),
        label: n.label,
        color: colorForType(type),
        _type: type,
      })
    }
    for (const e of drawEdges) {
      // multi-graph allows duplicate edges between the same pair; addEdge
      // mints a unique internal key so RELATED_TO + IS_INSTANCE_OF
      // between the same pair both survive.
      try {
        g.addEdgeWithKey(e.id, e.source, e.target, {
          size: 0.4,
          color: 'rgba(120,120,135,0.35)',
          label: e.label ?? '',
        })
      } catch {
        // duplicate edge key — ignore.
      }
    }
    // Static layout pass. iterations scale roughly with sqrt(n).
    if (g.order > 0) {
      forceAtlas2.assign(g, {
        iterations: Math.max(50, Math.min(200, Math.floor(Math.sqrt(g.order) * 8))),
        settings: {
          gravity: 1,
          scalingRatio: 10,
          slowDown: 1.5,
          barnesHutOptimize: g.order > 500,
          strongGravityMode: false,
        },
      })
    }
    return g
  }

  function rebuild() {
    if (!canvasEl) return
    sigmaInstance?.kill()
    sigmaInstance = null
    if (drawNodes.length === 0) return
    const g = buildGraphology()
    sigmaInstance = new Sigma(g, canvasEl, {
      renderEdgeLabels: drawEdges.length < 400,
      labelDensity: 0.5,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 6,
      defaultEdgeColor: 'rgba(120,120,135,0.35)',
      defaultNodeColor: '#94a3b8',
      labelColor: { color: '#94a3b8' },
      edgeLabelColor: { color: '#64748b' },
      labelFont: 'JetBrains Mono Variable, monospace',
      labelSize: 11,
      edgeLabelFont: 'JetBrains Mono Variable, monospace',
      edgeLabelSize: 9,
    })
    sigmaInstance.on('clickNode', ({ node }) => {
      selectedEdge = null
      selectedNode = graph.nodes.find((n) => n.id === node) ?? null
    })
    sigmaInstance.on('clickEdge', ({ edge }) => {
      selectedNode = null
      selectedEdge = graph.edges.find((e) => e.id === edge) ?? null
    })
    sigmaInstance.on('clickStage', () => {
      // Click on empty canvas dismisses selection.
      selectedNode = null
      selectedEdge = null
    })
  }

  // React to data/filter/limit changes — rebuild whenever the visible
  // sub-graph changes shape.
  $effect(() => {
    // touch the things we depend on so the effect re-runs
    void drawNodes
    void drawEdges
    if (viewMode === 'canvas' && canvasEl) rebuild()
  })

  // Mount/unmount lifecycle: kill Sigma on destroy and on view-mode change
  // away from canvas so its WebGL context is released.
  $effect(() => {
    if (viewMode !== 'canvas') {
      sigmaInstance?.kill()
      sigmaInstance = null
    }
  })

  onDestroy(() => {
    sigmaInstance?.kill()
    sigmaInstance = null
  })

  function clearSelection() {
    selectedNode = null
    selectedEdge = null
  }

  function nodeById(id: string): GraphNode | null {
    return graph.nodes.find((n) => n.id === id) ?? null
  }

  const topEdgeLabels = $derived.by(() => {
    const counts = new Map<string, number>()
    for (const e of graph.edges) {
      if (!e.label) continue
      counts.set(e.label, (counts.get(e.label) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  })
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if graph.nodes.length === 0 && graph.edges.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No graph shape in this result.
    </div>
  {:else}
    <!-- Toolbar -->
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={[
            'inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer transition-colors',
            viewMode === 'canvas' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => (viewMode = 'canvas')}
          aria-pressed={viewMode === 'canvas'}
        >
          <Network class="size-3" />
          Canvas
        </button>
        <button
          type="button"
          class={[
            'inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer transition-colors border-l border-line-2',
            viewMode === 'table' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => (viewMode = 'table')}
          aria-pressed={viewMode === 'table'}
        >
          <Table2 class="size-3" />
          Table
        </button>
      </div>

      {#if viewMode === 'canvas'}
        <div class="inline-flex items-center gap-1.5 border border-line-1 rounded px-2 py-1 bg-bg-0">
          <Search class="size-3 text-fg-3" />
          <input
            type="text"
            bind:value={labelFilter}
            placeholder="filter by label…"
            class="bg-transparent text-fg-1 text-[11px] outline-none w-[160px] placeholder:text-fg-3"
          />
          {#if labelFilter}
            <button type="button" class="text-fg-3 hover:text-fg-1 cursor-pointer" onclick={() => (labelFilter = '')} aria-label="Clear filter">
              <X class="size-3" />
            </button>
          {/if}
        </div>

        <label class="inline-flex items-center gap-1.5 text-fg-3">
          <Maximize2 class="size-3" />
          <span>limit:</span>
          <select
            class="bg-bg-1 text-fg-1 border border-line-1 rounded px-1 py-0.5"
            value={canvasLimit}
            onchange={(e) => (canvasLimit = Number((e.currentTarget as HTMLSelectElement).value))}
          >
            <option value={500}>500</option>
            <option value={1000}>1k</option>
            <option value={2000}>2k</option>
            <option value={5000}>5k</option>
            <option value={10000}>10k</option>
            <option value={50000}>all</option>
          </select>
        </label>
      {/if}

      <button
        type="button"
        class={[
          'inline-flex items-center gap-1 h-6 px-2 rounded border cursor-pointer transition-colors',
          queryOpen ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2',
        ].join(' ')}
        onclick={() => (queryOpen = !queryOpen)}
        aria-pressed={queryOpen}
        title="Run a graph query (GRAPH NEIGHBORHOOD / SHORTEST_PATH / MATCH …)"
      >
        <Code2 class="size-3" />
        query
      </button>

      {#if overrideResult}
        <button
          type="button"
          class="inline-flex items-center gap-1 h-6 px-2 rounded border border-line-1 text-fg-3 hover:text-fg-1 cursor-pointer"
          onclick={resetToOriginal}
          title="Discard graph query and show the original collection result"
        >
          <RotateCw class="size-3" />
          reset
        </button>
      {/if}

      <div class="ml-auto flex items-center gap-3 text-fg-3">
        <span>{graph.nodes.length.toLocaleString()} nodes · {graph.edges.length.toLocaleString()} edges</span>
        {#if viewMode === 'canvas' && truncated}
          <span class="text-warn" title="More nodes match — raise the limit or narrow the filter to see them">
            drawing {drawNodes.length.toLocaleString()}
          </span>
        {/if}
        {#if collection}<span class="text-fg-2">{collection}</span>{/if}
      </div>
    </div>

    {#if queryOpen}
      <div class="border-b border-line-1 px-3 py-2 bg-bg-1/20 text-[11px] font-mono">
        <div class="flex items-center gap-2 mb-1.5 text-fg-3">
          <span>quick:</span>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded border border-line-1 hover:border-line-2 hover:text-fg-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedNode}
            onclick={quickNeighborhood}
            title={selectedNode ? `neighborhood of ${selectedNode.label}` : 'select a node first'}
          >
            neighborhood of selected
          </button>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded border border-line-1 hover:border-line-2 hover:text-fg-1 cursor-pointer"
            onclick={quickCentrality}
          >
            top centrality
          </button>
        </div>
        <div class="flex items-stretch gap-2">
          <textarea
            bind:value={queryText}
            placeholder={collection ? `GRAPH NEIGHBORHOOD '<label>' DEPTH 2\nSELECT * FROM ${collection} WHERE from_rid IS NOT NULL LIMIT 500\nMATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100` : 'GRAPH NEIGHBORHOOD … / MATCH … / SELECT …'}
            spellcheck="false"
            rows="3"
            class="flex-1 bg-bg-0 text-fg-1 border border-line-1 rounded px-2 py-1 text-[12px] font-mono outline-none focus:border-accent placeholder:text-fg-3 resize-none"
            onkeydown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                runQuery(queryText)
              }
            }}
          ></textarea>
          <div class="flex flex-col gap-1.5">
            <button
              type="button"
              onclick={() => runQuery(queryText)}
              disabled={querying || !queryText.trim()}
              class="inline-flex items-center gap-1.5 h-7 px-3 rounded bg-accent text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ff3868]"
            >
              {#if querying}<Loader2 class="size-3 animate-spin" />{:else}<Play class="size-3" />{/if}
              run
              <span class="text-[9px] opacity-70">⌘↵</span>
            </button>
          </div>
        </div>
        {#if queryError}
          <div class="mt-1.5 text-warn">{queryError}</div>
        {/if}
      </div>
    {/if}

    <!-- Body -->
    <div class="flex-1 min-h-0 relative">
      {#if viewMode === 'canvas'}
        <div bind:this={canvasEl} class="absolute inset-0 sigma-canvas"></div>
      {:else}
        <div class="absolute inset-0 overflow-auto">
          <table class="w-full border-collapse text-[12px] font-mono">
            <thead class="sticky top-0 bg-bg-1 z-10">
              <tr class="border-b border-line-1 text-fg-3">
                <th class="px-2 py-1.5 text-left font-normal whitespace-nowrap">type</th>
                <th class="px-2 py-1.5 text-left font-normal whitespace-nowrap">id / rid</th>
                <th class="px-2 py-1.5 text-left font-normal whitespace-nowrap">label</th>
                <th class="px-2 py-1.5 text-left font-normal whitespace-nowrap">node_type / endpoints</th>
              </tr>
            </thead>
            <tbody>
              {#each graph.nodes as n (n.id)}
                <tr class="border-b border-line-1/60 hover:bg-bg-1/40 cursor-pointer" onclick={() => { selectedEdge = null; selectedNode = n }}>
                  <td class="px-2 py-1 text-fg-3">node</td>
                  <td class="px-2 py-1 text-accent font-semibold">{n.id}</td>
                  <td class="px-2 py-1 text-fg-0">{n.label}</td>
                  <td class="px-2 py-1 text-fg-2">{String(n.data.node_type ?? '')}</td>
                </tr>
              {/each}
              {#each graph.edges as e (e.id)}
                <tr class="border-b border-line-1/60 hover:bg-bg-1/40 cursor-pointer" onclick={() => { selectedNode = null; selectedEdge = e }}>
                  <td class="px-2 py-1 text-fg-3">edge</td>
                  <td class="px-2 py-1 text-fg-2">{e.id}</td>
                  <td class="px-2 py-1 text-fg-0">{e.label ?? ''}</td>
                  <td class="px-2 py-1 text-fg-2">{e.source} → {e.target}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- Side panel: node / edge details -->
      {#if selectedNode || selectedEdge}
        <aside class="absolute top-0 right-0 bottom-0 w-[340px] bg-bg-1 border-l border-line-2 shadow-2xl flex flex-col z-20">
          <header class="flex items-center gap-2 px-3 py-2 border-b border-line-1 text-[11px] font-mono">
            <Info class="size-3.5 text-accent" />
            <span class="type-label">
              {selectedNode ? 'Node' : 'Edge'}
            </span>
            <span class="ml-auto"></span>
            <button type="button" onclick={clearSelection} aria-label="Close panel" class="text-fg-3 hover:text-fg-1 cursor-pointer">
              <X class="size-3.5" />
            </button>
          </header>
          <div class="flex-1 overflow-auto p-3 text-[12px] font-mono">
            {#if selectedNode}
              <div class="mb-2">
                <div class="text-fg-3 text-[10px] uppercase tracking-wider">label</div>
                <div class="text-fg-0 font-semibold">{selectedNode.label}</div>
              </div>
              <div class="mb-2">
                <div class="text-fg-3 text-[10px] uppercase tracking-wider">rid</div>
                <div class="text-accent">{String(selectedNode.data.rid ?? selectedNode.id)}</div>
              </div>
            {:else if selectedEdge}
              <div class="mb-2">
                <div class="text-fg-3 text-[10px] uppercase tracking-wider">label</div>
                <div class="text-fg-0 font-semibold">{selectedEdge.label ?? '(unlabelled)'}</div>
              </div>
              <div class="mb-2 grid grid-cols-[60px_1fr] gap-x-2 gap-y-1">
                <div class="text-fg-3 text-[10px] uppercase tracking-wider">from</div>
                <div class="text-fg-1">
                  {#if nodeById(selectedEdge.source)}{nodeById(selectedEdge.source)!.label}{:else}<code>{selectedEdge.source}</code>{/if}
                </div>
                <div class="text-fg-3 text-[10px] uppercase tracking-wider">to</div>
                <div class="text-fg-1">
                  {#if nodeById(selectedEdge.target)}{nodeById(selectedEdge.target)!.label}{:else}<code>{selectedEdge.target}</code>{/if}
                </div>
              </div>
            {/if}

            <div class="mt-3 mb-1 text-fg-3 text-[10px] uppercase tracking-wider">properties</div>
            <dl class="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1">
              {#each Object.entries((selectedNode ? selectedNode.data : selectedEdge?.data) ?? {}) as [k, v]}
                {#if v !== null && v !== undefined && k !== 'rid' && k !== 'label'}
                  <dt class="text-fg-3 truncate">{k}</dt>
                  <dd class="text-fg-1 break-words">
                    {#if typeof v === 'object'}
                      <pre class="whitespace-pre-wrap text-[11px]">{JSON.stringify(v, null, 2)}</pre>
                    {:else}
                      {String(v)}
                    {/if}
                  </dd>
                {/if}
              {/each}
            </dl>
          </div>
        </aside>
      {/if}
    </div>

    <!-- Footer: node-type chips + top edge labels -->
    <div class="border-t border-line-1 px-3 py-1.5 text-[10px] font-mono text-fg-3 flex items-center gap-2 flex-wrap">
      {#if availableTypes.length > 1}
        <span class="text-fg-3">types:</span>
        {#each availableTypes as [t, count] (t)}
          {@const hidden = hiddenTypes.has(t)}
          <button
            type="button"
            onclick={() => toggleType(t)}
            title={hidden ? `Show ${t}` : `Hide ${t}`}
            class={[
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer',
              hidden
                ? 'border-line-1 text-fg-3 line-through opacity-60'
                : 'border-line-2 text-fg-1 hover:border-accent',
            ].join(' ')}
          >
            <span style:color={hidden ? undefined : colorForType(t)}>●</span>
            <span>{t}</span>
            <span class="text-fg-3">{count.toLocaleString()}</span>
          </button>
        {/each}
      {/if}
      <span class="ml-auto"></span>
      {#if topEdgeLabels.length > 0}
        {#each topEdgeLabels as [label, count]}
          <span><span class="text-fg-2">{label}</span> <span class="text-fg-3">·</span> {count.toLocaleString()}</span>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .sigma-canvas {
    background-color: var(--color-bg-0);
  }
  .sigma-canvas :global(canvas) {
    background-color: var(--color-bg-0) !important;
  }
</style>
