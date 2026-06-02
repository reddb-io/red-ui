<script lang="ts">
  import type { QueryResult } from '#reddb'
  import { onDestroy, onMount } from 'svelte'
  import { colorForCommunity, compareGraphNodesByCentrality, extractGraph, graphNodeCentrality, graphNodeDetail, graphNodeIncomingSizeScales, graphNodeIsOrphan, runGraphLayout, type GraphNode, type GraphEdge, type GraphNodeRelation } from './graph-render'
  import {
    buildSigmaGraph,
    colorForType,
    nodeVisualRadius,
    reduceSigmaEdge,
    reduceSigmaNode,
    FOCUS_EDGE_COLOR,
    FOCUS_NODE_STROKE_COLOR,
    type SigmaReducerState,
    type SigmaThemeColors,
  } from './graph-sigma'
  import { collectionPageHref } from '$lib/collection-pages'
  import { connection } from '$lib/connections.svelte'
  import { activity } from '$lib/activity.svelte'
  import { Network, Table2, Search, X, Info, Maximize2, Play, Code2, RotateCw, Loader2, Route, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-svelte'

  interface Props {
    result: QueryResult
    collection?: string
    subpage?: string
    showSystem?: boolean
  }

  interface FallbackSvgNode extends GraphNode {
    x: number
    y: number
    r: number
    color: string
  }

  interface FallbackSvgEdge extends GraphEdge {
    x1: number
    y1: number
    x2: number
    y2: number
  }

  let { result, collection, subpage }: Props = $props()

  // ─── data ───────────────────────────────────────────────────────────────
  let overrideResult = $state<QueryResult | null>(null)
  const activeResult = $derived(overrideResult ?? result)
  const graph = $derived(extractGraph(activeResult))
  const nodeCentrality = $derived(graphNodeCentrality(graph.nodes, graph.edges))
  const nodeSizeScales = $derived(graphNodeIncomingSizeScales(graph.nodes, nodeCentrality))
  const orphanNodeIds = $derived.by(() => {
    return new Set(
      graph.nodes
        .filter((node) => graphNodeIsOrphan(node, nodeCentrality))
        .map((node) => node.id),
    )
  })

  // ─── view state ─────────────────────────────────────────────────────────
  let viewMode = $state<'canvas' | 'svg' | 'table'>('canvas')
  let canvasLimit = $state(25000)
  let labelFilter = $state('')
  let selectedNode = $state<GraphNode | null>(null)
  let selectedEdge = $state<GraphEdge | null>(null)
  let canvasError = $state<string | null>(null)
  let renderBudget = $state(350)
  let svgZoom = $state(1)

  const selectedNodeDetail = $derived(
    selectedNode
      ? graphNodeDetail(selectedNode, graph.nodes, graph.edges, nodeCentrality)
      : null,
  )

  $effect(() => {
    if (subpage === 'svg' && viewMode !== 'svg') viewMode = 'svg'
    else if (subpage === 'graph' && viewMode !== 'canvas') viewMode = 'canvas'
  })
  let hoveredFocusNodeId = $state<string | null>(null)
  let pinnedFocusNodeId = $state<string | null>(null)

  // ─── query toolbar state ────────────────────────────────────────────────
  let queryOpen = $state(false)
  let queryText = $state('')
  let querying = $state(false)
  let queryError = $state<string | null>(null)
  let pathFrom = $state('')
  let pathTo = $state('')

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
      clearGraphFocus()
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
    clearGraphFocus()
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

  function useSelectedForPath(which: 'from' | 'to') {
    if (!selectedNode) return
    if (which === 'from') pathFrom = selectedNode.label
    else pathTo = selectedNode.label
    queryOpen = true
  }

  function quickShortestPath() {
    if (!pathFrom.trim() || !pathTo.trim()) return
    queryText = `GRAPH SHORTEST_PATH '${pathFrom.trim()}' TO '${pathTo.trim()}'`
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
    }).sort((a, b) => compareGraphNodesByCentrality(a, b, nodeCentrality))
  })

  const renderTarget = $derived(Math.min(filteredNodes.length, canvasLimit))
  const drawNodes = $derived(filteredNodes.slice(0, Math.min(renderTarget, renderBudget)))
  const drawNodeIds = $derived(new Set(drawNodes.map((n) => n.id)))
  const drawEdges = $derived(
    graph.edges.filter((e) => drawNodeIds.has(e.source) && drawNodeIds.has(e.target)),
  )

  const rendering = $derived(drawNodes.length < renderTarget)
  const truncated = $derived(filteredNodes.length > canvasLimit)

  $effect(() => {
    const total = renderTarget
    const batchSize = viewMode === 'canvas' ? 1000 : 350
    const initial = Math.min(total, batchSize)
    renderBudget = initial
    if (initial >= total) return

    let cancelled = false
    let raf = 0
    let current = initial
    const step = () => {
      if (cancelled) return
      current = Math.min(total, current + batchSize)
      renderBudget = current
      if (current < total) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  })

  function toggleType(t: string) {
    const next = new Set(hiddenTypes)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    hiddenTypes = next
  }

  // Color/size contract (community fill + type stroke) lives in graph-sigma.ts
  // so the WebGL adapter and the SVG fallback share one source of truth.
  const focusEdgeColor = FOCUS_EDGE_COLOR
  const focusNodeStrokeColor = FOCUS_NODE_STROKE_COLOR

  // ─── sigma (WebGL) renderer for the canvas view ─────────────────────────
  // sigma touches WebGL globals at import time, so it is loaded lazily in the
  // browser only. Everything DOM-free lives in ./graph-sigma (and is tested).
  //
  // Ceiling: WebGL renders the node/edge geometry without blocking the main
  // thread well past the previous 2D-canvas limit — the `limit` select goes to
  // 50k and 25k draws smoothly. The remaining cost is the community-aware
  // layout (Louvain → ForceAtlas2 in graph-render.ts), which is CPU-bound and
  // unchanged by this migration; the progressive `renderBudget` reveal keeps it
  // off the critical path. Above ~50k, raise the limit but expect the *layout*
  // (not the render) to dominate frame time.
  let sigmaContainer: HTMLDivElement | undefined = $state()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sigmaInstance: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sigmaModules: { Sigma: any; NodeBorderProgram: any } | null = null
  let cameraRatio = $state(1)
  let pulseProgress = $state(0)
  let pulseRaf = 0
  let graphThemeVersion = $state(0)

  function prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  onDestroy(() => {
    cancelAnimationFrame(pulseRaf)
    if (sigmaInstance) {
      sigmaInstance.kill()
      sigmaInstance = null
    }
  })

  onMount(() => {
    const observer = new MutationObserver(() => {
      graphThemeVersion += 1
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  })

  function clearSelection() {
    selectedNode = null
    selectedEdge = null
  }

  function clearGraphFocus() {
    hoveredFocusNodeId = null
    pinnedFocusNodeId = null
  }

  function nodeById(id: string): GraphNode | null {
    return graph.nodes.find((n) => n.id === id) ?? null
  }

  function selectRelationNode(relation: GraphNodeRelation) {
    const node = nodeById(relation.nodeId)
    if (!node) return
    pinFocusNode(node)
    selectNode(node)
  }

  function selectNode(node: GraphNode) {
    selectedEdge = null
    selectedNode = node
  }

  function pinFocusNode(node: GraphNode) {
    pinnedFocusNodeId = node.id
    hoveredFocusNodeId = node.id
  }

  function clickGraphNode(node: GraphNode) {
    if (pinnedFocusNodeId) {
      clearGraphFocus()
      clearSelection()
      return
    }
    pinFocusNode(node)
    selectNode(node)
  }

  function selectEdge(edge: GraphEdge) {
    selectedNode = null
    selectedEdge = edge
  }

  function isPromotedNodeProperty(key: string): boolean {
    return [
      'id',
      'rid',
      'label',
      'name',
      'title',
      'description',
      'summary',
      'content',
      'exports',
      'orphan',
      'is_orphan',
      'isOrphan',
      'dead_code',
      'deadCode',
    ].includes(key)
  }

  function onSelectableKey(e: KeyboardEvent, fn: () => void) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    fn()
  }

  function clampZoom(value: number): number {
    return Math.max(0.5, Math.min(8, value))
  }

  // Zoom percentage shown in the toolbar: sigma camera ratio for canvas,
  // the SVG scale factor otherwise (ratio 1 = 100%, zooming in lowers ratio).
  const zoomPercent = $derived(
    viewMode === 'canvas'
      ? Math.round(100 / (cameraRatio || 1))
      : Math.round(svgZoom * 100),
  )

  function zoomSvg(direction: 'in' | 'out') {
    if (viewMode === 'canvas') {
      const camera = sigmaInstance?.getCamera()
      if (!camera) return
      if (direction === 'in') camera.animatedZoom(1.4)
      else camera.animatedUnzoom(1.4)
      return
    }
    const factor = direction === 'in' ? 1.25 : 0.8
    svgZoom = clampZoom(svgZoom * factor)
  }

  function resetSvgZoom() {
    if (viewMode === 'canvas') {
      sigmaInstance?.getCamera().animatedReset()
      return
    }
    svgZoom = 1
  }

  function onSvgWheel(e: WheelEvent) {
    // Canvas mode lets sigma's built-in camera handle the wheel; this only
    // drives the SVG fallback's scale transform.
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.25 : 0.8
    svgZoom = clampZoom(svgZoom * factor)
  }

  const topEdgeLabels = $derived.by(() => {
    const counts = new Map<string, number>()
    for (const e of graph.edges) {
      if (!e.label) continue
      counts.set(e.label, (counts.get(e.label) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  })

  // Community-aware positions: Louvain → ForceAtlas2. Clusters group
  // spatially, hubs gravitate to community centres, edge crossings drop.
  // See packages/ui/src/lib/renderers/graph-render.ts → runGraphLayout.
  const layout = $derived(runGraphLayout(drawNodes, drawEdges))

  const fallbackSvgNodes = $derived.by<FallbackSvgNode[]>(() => {
    return drawNodes.map((node) => {
      const type = String(node.data.node_type ?? 'node')
      const incomingScale = nodeSizeScales.get(node.id) ?? 1
      const pos = layout.get(node.id)
      // Community tint as primary color so clusters read at a glance;
      // type still drives the radius/stroke contract.
      const color = pos ? colorForCommunity(pos.community) : colorForType(type)
      return {
        ...node,
        x: pos?.x ?? 50,
        y: pos?.y ?? 50,
        r: nodeVisualRadius(type, incomingScale),
        color,
      }
    })
  })

  const fallbackSvgNodeById = $derived(new Map(fallbackSvgNodes.map((n) => [n.id, n])))
  const fallbackSvgEdges = $derived.by<FallbackSvgEdge[]>(() => {
    const out: FallbackSvgEdge[] = []
    for (const edge of drawEdges) {
      const source = fallbackSvgNodeById.get(edge.source)
      const target = fallbackSvgNodeById.get(edge.target)
      if (!source || !target) continue
      out.push({
        ...edge,
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
      })
    }
    return out
  })

  const activeFocusNodeId = $derived(pinnedFocusNodeId ?? hoveredFocusNodeId)

  const focusEdgeIds = $derived.by(() => {
    const ids = new Set<string>()
    if (!activeFocusNodeId) return ids
    for (const edge of fallbackSvgEdges) {
      if (edge.source === activeFocusNodeId || edge.target === activeFocusNodeId) ids.add(edge.id)
    }
    return ids
  })

  const focusNodeIds = $derived.by(() => {
    const ids = new Set<string>()
    if (!activeFocusNodeId) return ids
    ids.add(activeFocusNodeId)
    for (const edge of fallbackSvgEdges) {
      if (edge.source === activeFocusNodeId) ids.add(edge.target)
      if (edge.target === activeFocusNodeId) ids.add(edge.source)
    }
    return ids
  })

  // Focus pulse — drives pulseProgress, read by the sigma node reducer.
  $effect(() => {
    const focusId = activeFocusNodeId
    if (!focusId) {
      pulseProgress = 0
      return
    }
    if (!fallbackSvgNodeById.has(focusId)) {
      clearGraphFocus()
      return
    }
    startFocusPulse()
  })

  function startFocusPulse() {
    cancelAnimationFrame(pulseRaf)
    // prefers-reduced-motion: skip the grow-and-settle pulse entirely.
    if (prefersReducedMotion()) {
      pulseProgress = 0
      return
    }
    const start = performance.now()
    pulseProgress = 1
    const tick = () => {
      const p = Math.max(0, 1 - (performance.now() - start) / 170)
      pulseProgress = p
      if (p > 0) pulseRaf = requestAnimationFrame(tick)
    }
    pulseRaf = requestAnimationFrame(tick)
  }

  const graphTransform = $derived(`translate(50 50) scale(${svgZoom}) translate(-50 -50)`)

  function cssColor(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  }

  // Theme-aware palette handed to the sigma reducers (dark tokens drive it).
  function sigmaThemeColors(): SigmaThemeColors {
    const dark = document.documentElement.dataset.theme !== 'light'
    return {
      background: cssColor('--color-bg-0', dark ? '#050607' : '#ffffff'),
      edge: cssColor('--color-line-3', dark ? '#3a424d' : '#c9cbd1'),
      focusEdge: focusEdgeColor,
      focusNodeStroke: focusNodeStrokeColor,
      selectedNodeStroke: dark ? '#0a0a0b' : '#18181b',
      nodeStroke: dark ? '#ffffff' : '#27272a',
      warn: cssColor('--color-warn', dark ? '#fbbf24' : '#b45309'),
    }
  }

  // Live state the sigma reducers close over; rebuilt cheaply per refresh.
  function sigmaReducerState(): SigmaReducerState {
    return {
      focusId: activeFocusNodeId,
      focus: { nodes: focusNodeIds, edges: focusEdgeIds },
      selectedNodeId: selectedNode?.id ?? null,
      pulse: pulseProgress,
      colors: sigmaThemeColors(),
    }
  }

  function buildCurrentSigmaGraph() {
    return buildSigmaGraph({
      nodes: drawNodes,
      edges: drawEdges,
      layout,
      sizeScales: nodeSizeScales,
      orphanIds: orphanNodeIds,
      dark: document.documentElement.dataset.theme !== 'light',
      edgeColor: sigmaThemeColors().edge,
    })
  }

  function edgeById(id: string): GraphEdge | null {
    return drawEdges.find((e) => e.id === id) ?? null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function wireSigmaEvents(instance: any) {
    instance.on('clickNode', ({ node }: { node: string }) => {
      const gn = nodeById(node)
      if (gn) clickGraphNode(gn)
    })
    instance.on('enterNode', ({ node }: { node: string }) => {
      if (!pinnedFocusNodeId) hoveredFocusNodeId = node
      if (sigmaContainer) sigmaContainer.style.cursor = 'pointer'
    })
    instance.on('leaveNode', () => {
      if (!pinnedFocusNodeId) hoveredFocusNodeId = null
      if (sigmaContainer) sigmaContainer.style.cursor = ''
    })
    instance.on('clickEdge', ({ edge }: { edge: string }) => {
      const ge = edgeById(edge)
      if (ge) {
        clearGraphFocus()
        selectEdge(ge)
      }
    })
    instance.on('clickStage', () => {
      clearGraphFocus()
      clearSelection()
    })
    const camera = instance.getCamera()
    camera.on('updated', () => {
      cameraRatio = camera.ratio
    })
  }

  // Create / tear down the sigma (WebGL) instance with the canvas view.
  $effect(() => {
    if (viewMode !== 'canvas') return
    const container = sigmaContainer
    if (!container) return
    let killed = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null
    void (async () => {
      try {
        if (!sigmaModules) {
          const [sig, nb] = await Promise.all([
            import('sigma'),
            import('@sigma/node-border'),
          ])
          sigmaModules = { Sigma: sig.default, NodeBorderProgram: nb.NodeBorderProgram }
        }
        if (killed || !sigmaContainer) return
        const { Sigma, NodeBorderProgram } = sigmaModules
        instance = new Sigma(buildCurrentSigmaGraph(), container, {
          allowInvalidContainer: true,
          defaultNodeType: 'border',
          nodeProgramClasses: { border: NodeBorderProgram },
          defaultEdgeType: 'line',
          renderEdgeLabels: true,
          labelFont: '"JetBrains Mono Variable", monospace',
          edgeLabelFont: '"JetBrains Mono Variable", monospace',
          labelSize: 12,
          edgeLabelSize: 10,
          labelWeight: '700',
          labelColor: { color: cssColor('--color-fg-0', '#ffffff') },
          edgeLabelColor: { color: '#f6d36b' },
          labelRenderedSizeThreshold: Infinity,
          zIndex: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeReducer: (node: string, data: any) =>
            reduceSigmaNode(node, data, sigmaReducerState()),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          edgeReducer: (edge: string, data: any) =>
            reduceSigmaEdge(edge, data, sigmaReducerState()),
        })
        wireSigmaEvents(instance)
        sigmaInstance = instance
        cameraRatio = instance.getCamera().ratio
        canvasError = null
      } catch (e) {
        canvasError = (e as Error).message
      }
    })()
    return () => {
      killed = true
      if (instance) instance.kill()
      if (sigmaInstance === instance) sigmaInstance = null
    }
  })

  // Swap the graph in place when the draw set, layout, or theme changes.
  $effect(() => {
    void drawNodes
    void drawEdges
    void layout
    void nodeSizeScales
    void orphanNodeIds
    void graphThemeVersion
    const instance = sigmaInstance
    if (!instance || viewMode !== 'canvas') return
    // Label colours are static settings (reducers can't set them), so refresh
    // them here to stay theme-aware on a dark/light token swap.
    instance.setSetting('labelColor', { color: cssColor('--color-fg-0', '#ffffff') })
    instance.setGraph(buildCurrentSigmaGraph())
    instance.refresh()
  })

  // Re-run reducers (no re-index) when focus / selection / pulse changes.
  $effect(() => {
    void activeFocusNodeId
    void focusNodeIds
    void focusEdgeIds
    void selectedNode
    void pulseProgress
    const instance = sigmaInstance
    if (!instance || viewMode !== 'canvas') return
    instance.refresh({ skipIndexation: true })
  })

  function onSvgNodePointerEnter(node: GraphNode) {
    if (!pinnedFocusNodeId) hoveredFocusNodeId = node.id
  }

  function onSvgNodePointerLeave(node: GraphNode) {
    if (!pinnedFocusNodeId && hoveredFocusNodeId === node.id) hoveredFocusNodeId = null
  }

  function svgNodeRadius(node: FallbackSvgNode): number {
    if (!activeFocusNodeId) return node.r * 1.14
    if (activeFocusNodeId === node.id) return node.r * 2.24
    if (focusNodeIds.has(node.id)) return node.r * 1.6
    return node.r * 0.92
  }

  function svgNodeOpacity(node: FallbackSvgNode): number {
    if (!activeFocusNodeId) return 1
    return focusNodeIds.has(node.id) ? 1 : 0.12
  }

  function showSvgLabel(node: FallbackSvgNode): boolean {
    if (!activeFocusNodeId) return false
    if (activeFocusNodeId === node.id) return true
    return focusNodeIds.size <= 36 && focusNodeIds.has(node.id)
  }

  function showSvgEdgeLabel(edge: FallbackSvgEdge): boolean {
    return Boolean(activeFocusNodeId && focusEdgeIds.has(edge.id) && edge.label)
  }
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
        <a
          href={collection ? collectionPageHref(collection, 'graph') : undefined}
          class={[
            'inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer transition-colors',
            viewMode === 'canvas' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => { if (!collection) viewMode = 'canvas' }}
          aria-current={viewMode === 'canvas' ? 'page' : undefined}
        >
          <Network class="size-3" />
          Canvas
        </a>
        <a
          href={collection ? collectionPageHref(collection, 'svg') : undefined}
          class={[
            'inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer transition-colors border-l border-line-2',
            viewMode === 'svg' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => { if (!collection) viewMode = 'svg' }}
          aria-current={viewMode === 'svg' ? 'page' : undefined}
        >
          <Network class="size-3" />
          SVG
        </a>
        <a
          href={collection ? collectionPageHref(collection, 'table') : undefined}
          class={[
            'inline-flex items-center gap-1 px-2 py-1 text-[11px] cursor-pointer transition-colors border-l border-line-2',
            viewMode === 'table' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => { if (!collection) viewMode = 'table' }}
          aria-current={viewMode === 'table' ? 'page' : undefined}
        >
          <Table2 class="size-3" />
          Table
        </a>
      </div>

      {#if viewMode !== 'table'}
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
            <option value={25000}>25k</option>
            <option value={50000}>50k</option>
          </select>
        </label>
      {/if}

      {#if viewMode !== 'table'}
        <div class="inline-flex items-center overflow-hidden rounded border border-line-1 bg-bg-0">
          <button
            type="button"
            class="inline-flex h-6 w-7 items-center justify-center text-fg-3 hover:bg-bg-1 hover:text-fg-0 disabled:opacity-40"
            onclick={() => zoomSvg('out')}
            disabled={viewMode === 'svg' && svgZoom <= 0.5}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut class="size-3.5" />
          </button>
          <button
            type="button"
            class="inline-flex h-6 min-w-12 items-center justify-center border-x border-line-1 px-2 text-[10px] text-fg-3 hover:bg-bg-1 hover:text-fg-0"
            onclick={resetSvgZoom}
            title="Fit graph"
            aria-label="Fit graph"
          >
            {zoomPercent}%
          </button>
          <button
            type="button"
            class="inline-flex h-6 w-7 items-center justify-center text-fg-3 hover:bg-bg-1 hover:text-fg-0 disabled:opacity-40"
            onclick={() => zoomSvg('in')}
            disabled={viewMode === 'svg' && svgZoom >= 8}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn class="size-3.5" />
          </button>
        </div>
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
        {#if viewMode !== 'table' && rendering}
          <span class="text-accent">rendering {drawNodes.length.toLocaleString()} / {renderTarget.toLocaleString()}</span>
        {/if}
        {#if viewMode !== 'table' && truncated}
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
          <button
            type="button"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-line-1 hover:border-line-2 hover:text-fg-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!pathFrom.trim() || !pathTo.trim()}
            onclick={quickShortestPath}
            title="Run shortest path in reddb"
          >
            <Route class="size-3" />
            shortest path
          </button>
        </div>
        <div class="mb-1.5 grid grid-cols-[1fr_1fr_auto_auto] gap-2">
          <input
            type="text"
            bind:value={pathFrom}
            placeholder="from label…"
            class="h-6 rounded border border-line-1 bg-bg-0 px-2 text-[11px] text-fg-1 outline-none placeholder:text-fg-3 focus:border-accent"
          />
          <input
            type="text"
            bind:value={pathTo}
            placeholder="to label…"
            class="h-6 rounded border border-line-1 bg-bg-0 px-2 text-[11px] text-fg-1 outline-none placeholder:text-fg-3 focus:border-accent"
          />
          <button
            type="button"
            class="rounded border border-line-1 px-1.5 text-fg-3 hover:border-line-2 hover:text-fg-1 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedNode}
            onclick={() => useSelectedForPath('from')}
            title={selectedNode ? `Use ${selectedNode.label} as source` : 'select a node first'}
          >
            use as from
          </button>
          <button
            type="button"
            class="rounded border border-line-1 px-1.5 text-fg-3 hover:border-line-2 hover:text-fg-1 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedNode}
            onclick={() => useSelectedForPath('to')}
            title={selectedNode ? `Use ${selectedNode.label} as target` : 'select a node first'}
          >
            use as to
          </button>
        </div>
        <div class="flex items-stretch gap-2">
          <textarea
            bind:value={queryText}
            placeholder={collection ? `GRAPH NEIGHBORHOOD '<label>' DEPTH 2\nGRAPH SHORTEST_PATH '<from>' TO '<to>'\nMATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100` : 'GRAPH NEIGHBORHOOD … / GRAPH SHORTEST_PATH … / MATCH …'}
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

    {#if canvasError}
      <div class="border-b border-line-1 bg-warn/10 px-3 py-2 text-[11px] font-mono text-warn flex items-start gap-2">
        <AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
        <div>
          <div>WebGL renderer unavailable. Switch to SVG or Table.</div>
          <div class="mt-0.5 break-words text-fg-3">{canvasError}</div>
        </div>
      </div>
    {/if}

    <!-- Body -->
    <div class="flex-1 min-h-0 relative">
      {#if viewMode === 'canvas'}
        <!-- sigma.js mounts its WebGL canvases into this container -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          bind:this={sigmaContainer}
          class="sigma-canvas absolute inset-0 h-full w-full bg-bg-0"
          role="application"
          tabindex="0"
          aria-label={`${drawNodes.length} graph nodes and ${drawEdges.length} graph edges`}
          onkeydown={(event) => { if (event.key === 'Escape') { clearGraphFocus(); clearSelection() } }}
        ></div>
      {:else if viewMode === 'svg'}
        <div class="absolute inset-0 overflow-hidden bg-bg-0">
          <svg
            class="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            role="button"
            tabindex="0"
            aria-label={`${drawNodes.length} graph nodes and ${drawEdges.length} graph edges`}
            onwheel={onSvgWheel}
            onclick={() => { clearGraphFocus(); clearSelection() }}
            onkeydown={(event) => { if (event.key === 'Escape') { clearGraphFocus(); clearSelection() } }}
          >
            <rect x="0" y="0" width="100" height="100" fill="transparent" />
            <g transform={graphTransform}>
              <g>
                {#each fallbackSvgEdges as e (e.id)}
                  {@const focusedEdge = focusEdgeIds.has(e.id)}
                  <line
                    x1={e.x1}
                    y1={e.y1}
                    x2={e.x2}
                    y2={e.y2}
                    stroke={activeFocusNodeId ? (focusedEdge ? focusEdgeColor : 'currentColor') : 'currentColor'}
                    stroke-width={activeFocusNodeId ? (focusedEdge ? '0.27' : '0.055') : '0.105'}
                    opacity={activeFocusNodeId ? (focusedEdge ? '0.98' : '0.055') : '0.36'}
                    class="text-line-3 cursor-pointer hover:text-accent"
                    vector-effect="non-scaling-stroke"
                    role="button"
                    tabindex="0"
                    aria-label={`${e.label ?? 'edge'} from ${e.source} to ${e.target}`}
                    onclick={(event) => { event.stopPropagation(); clearGraphFocus(); selectEdge(e) }}
                    onkeydown={(event) => onSelectableKey(event, () => { clearGraphFocus(); selectEdge(e) })}
                  >
                    <title>{e.label ?? 'edge'}: {e.source} -> {e.target}</title>
                  </line>
                  {#if showSvgEdgeLabel(e)}
                    <text
                      x={(e.x1 + e.x2) / 2 + 0.45}
                      y={(e.y1 + e.y2) / 2 - 0.45}
                      fill="#f6d36b"
                      opacity="0.96"
                      font-size="1"
                      font-weight="700"
                      font-family="JetBrains Mono Variable, monospace"
                      paint-order="stroke"
                      stroke="#020617"
                      stroke-width="0.38"
                      class="pointer-events-none select-none"
                    >
                      {e.label?.slice(0, 28)}
                    </text>
                  {/if}
                {/each}
              </g>
              <g>
                {#each fallbackSvgNodes as n (n.id)}
                  {@const orphan = orphanNodeIds.has(n.id)}
                  {#if orphan}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={svgNodeRadius(n) + 0.65}
                      fill="none"
                      stroke="var(--color-warn)"
                      stroke-width={activeFocusNodeId === n.id ? '0.38' : '0.24'}
                      opacity={activeFocusNodeId && !focusNodeIds.has(n.id) ? '0.16' : '0.72'}
                      vector-effect="non-scaling-stroke"
                      class="pointer-events-none"
                    />
                  {/if}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={svgNodeRadius(n)}
                    fill={n.color}
                    opacity={svgNodeOpacity(n)}
                    stroke={activeFocusNodeId === n.id ? focusNodeStrokeColor : selectedNode?.id === n.id ? '#0a0a0b' : orphan ? 'var(--color-warn)' : '#ffffff'}
                    stroke-width={activeFocusNodeId === n.id ? '0.55' : focusNodeIds.has(n.id) ? '0.22' : selectedNode?.id === n.id || orphan ? '0.4' : '0.14'}
                    class="cursor-pointer graph-node"
                    class:focus-primary={activeFocusNodeId === n.id}
                    vector-effect="non-scaling-stroke"
                    role="button"
                    tabindex="0"
                    aria-label={n.label}
                    onpointerenter={() => onSvgNodePointerEnter(n)}
                    onpointerleave={() => onSvgNodePointerLeave(n)}
                    onclick={(event) => { event.stopPropagation(); clickGraphNode(n) }}
                    onkeydown={(event) => onSelectableKey(event, () => clickGraphNode(n))}
                  >
                    <title>{n.label}</title>
                  </circle>
                  {#if showSvgLabel(n)}
                    <text
                      x={n.x + svgNodeRadius(n) + 0.85}
                      y={n.y + 0.15}
                      fill={activeFocusNodeId === n.id ? '#f8fafc' : '#cbd5e1'}
                      opacity={activeFocusNodeId === n.id ? '1' : '0.9'}
                      font-size={activeFocusNodeId === n.id ? '1.35' : '1.15'}
                      font-weight={activeFocusNodeId === n.id ? '700' : '600'}
                      font-family="JetBrains Mono Variable, monospace"
                      paint-order="stroke"
                      stroke="#020617"
                      stroke-width={activeFocusNodeId === n.id ? '0.48' : '0.38'}
                      class="pointer-events-none select-none"
                    >
                      {n.label.slice(0, 36)}
                    </text>
                  {/if}
                {/each}
              </g>
            </g>
          </svg>
        </div>
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
                {@const orphan = orphanNodeIds.has(n.id)}
                <tr class={['border-b border-line-1/60 hover:bg-bg-1/40 cursor-pointer', orphan ? 'bg-warn/10' : ''].join(' ')} onclick={() => { selectedEdge = null; selectedNode = n }}>
                  <td class="px-2 py-1 text-fg-3">node</td>
                  <td class="px-2 py-1 text-accent font-semibold">{n.id}</td>
                  <td class="px-2 py-1 text-fg-0">{n.label}</td>
                  <td class="px-2 py-1 text-fg-2">
                    {String(n.data.node_type ?? '')}
                    {#if orphan}<span class="ml-2 text-warn">orphan</span>{/if}
                  </td>
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
            <button type="button" onclick={() => { clearGraphFocus(); clearSelection() }} aria-label="Close panel" class="text-fg-3 hover:text-fg-1 cursor-pointer">
              <X class="size-3.5" />
            </button>
          </header>
          <div class="flex-1 overflow-auto p-3 text-[12px] font-mono">
            {#if selectedNode && selectedNodeDetail}
              <div class="mb-3">
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="text-fg-3 text-[10px] uppercase tracking-wider">label</div>
                    <div class="break-words text-[13px] font-semibold text-fg-0">{selectedNode.label}</div>
                  </div>
                  {#if selectedNodeDetail.orphan}
                    <span class="inline-flex shrink-0 items-center gap-1 rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn">
                      <AlertTriangle class="size-3" /> orphan
                    </span>
                  {/if}
                </div>
                <div class="mt-1 break-all text-accent">{String(selectedNode.data.rid ?? selectedNode.id)}</div>
              </div>

              <div class="mb-3 border-t border-line-1 pt-3">
                <div class="mb-1 text-fg-3 text-[10px] uppercase tracking-wider">description</div>
                <div class="whitespace-pre-wrap break-words text-fg-1">
                  {selectedNodeDetail.description ?? 'No description in graph contract.'}
                </div>
              </div>

              <div class="mb-3 border-t border-line-1 pt-3">
                <div class="mb-1.5 flex items-center justify-between gap-2">
                  <div class="text-fg-3 text-[10px] uppercase tracking-wider">exports</div>
                  <span class="text-[10px] text-fg-3">{selectedNodeDetail.exports.length.toLocaleString()}</span>
                </div>
                {#if selectedNodeDetail.exports.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each selectedNodeDetail.exports as name}
                      <span class="max-w-full truncate rounded border border-line-1 bg-bg-0 px-1.5 py-0.5 text-[11px] text-fg-1">
                        {name}
                      </span>
                    {/each}
                  </div>
                {:else}
                  <div class="text-fg-3">No exports recorded.</div>
                {/if}
              </div>

              <div class="mb-3 border-t border-line-1 pt-3">
                <div class="mb-1.5 flex items-center justify-between gap-2">
                  <div class="text-fg-3 text-[10px] uppercase tracking-wider">where used</div>
                  <span class="text-[10px] text-fg-3">{selectedNodeDetail.whereUsed.length.toLocaleString()} inbound</span>
                </div>
                {#if selectedNodeDetail.whereUsed.length > 0}
                  <div class="space-y-1">
                    {#each selectedNodeDetail.whereUsed as relation (relation.id)}
                      <button
                        type="button"
                        class="grid w-full grid-cols-[82px_1fr] gap-2 rounded border border-line-1 bg-bg-0 px-2 py-1.5 text-left hover:border-line-2 hover:bg-bg-2"
                        onclick={() => selectRelationNode(relation)}
                      >
                        <span class="text-[10px] uppercase tracking-wider text-fg-3">{relation.label}</span>
                        <span class="min-w-0">
                          <span class="block truncate text-fg-0">{relation.nodeLabel}</span>
                          <span class="block truncate text-[10px] text-fg-3">{relation.edgeLabel ?? relation.kind}</span>
                        </span>
                      </button>
                    {/each}
                  </div>
                {:else}
                  <div class="text-fg-3">No inbound uses.</div>
                {/if}
              </div>

              <div class="mb-3 border-t border-line-1 pt-3">
                <div class="mb-1.5 grid grid-cols-2 gap-2">
                  <div>
                    <div class="text-fg-3 text-[10px] uppercase tracking-wider">parents</div>
                    <div class="text-[10px] text-fg-3">incoming direction</div>
                  </div>
                  <div>
                    <div class="text-fg-3 text-[10px] uppercase tracking-wider">children</div>
                    <div class="text-[10px] text-fg-3">outgoing direction</div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    {#if selectedNodeDetail.incoming.length > 0}
                      {#each selectedNodeDetail.incoming as relation (relation.id)}
                        <button
                          type="button"
                          class="w-full rounded border border-line-1 bg-bg-0 px-2 py-1 text-left hover:border-line-2 hover:bg-bg-2"
                          onclick={() => selectRelationNode(relation)}
                        >
                          <span class="block truncate text-[10px] text-fg-3">{relation.label}</span>
                          <span class="block truncate text-fg-1">{relation.nodeLabel}</span>
                        </button>
                      {/each}
                    {:else}
                      <div class="rounded border border-line-1 px-2 py-1 text-fg-3">none</div>
                    {/if}
                  </div>
                  <div class="space-y-1">
                    {#if selectedNodeDetail.outgoing.length > 0}
                      {#each selectedNodeDetail.outgoing as relation (relation.id)}
                        <button
                          type="button"
                          class="w-full rounded border border-line-1 bg-bg-0 px-2 py-1 text-left hover:border-line-2 hover:bg-bg-2"
                          onclick={() => selectRelationNode(relation)}
                        >
                          <span class="block truncate text-[10px] text-fg-3">{relation.label}</span>
                          <span class="block truncate text-fg-1">{relation.nodeLabel}</span>
                        </button>
                      {/each}
                    {:else}
                      <div class="rounded border border-line-1 px-2 py-1 text-fg-3">none</div>
                    {/if}
                  </div>
                </div>
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
                {#if v !== null && v !== undefined && !(selectedNode && isPromotedNodeProperty(k)) && !(selectedEdge && k === 'label')}
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
  .graph-node {
    transition:
      r 80ms ease-out,
      opacity 80ms ease-out,
      stroke-width 80ms ease-out;
  }
  .focus-primary {
    animation: graph-focus-pop 170ms ease-out;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes graph-focus-pop {
    0% { transform: scale(0.72); }
    72% { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
  /* Respect reduced-motion on the focus pulse (SVG fallback; the sigma
     renderer is gated separately via prefersReducedMotion()). */
  @media (prefers-reduced-motion: reduce) {
    .graph-node {
      transition: none;
    }
    .focus-primary {
      animation: none;
    }
  }
</style>
