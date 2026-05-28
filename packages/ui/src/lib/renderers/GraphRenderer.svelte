<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { onDestroy, onMount } from 'svelte'
  import { colorForCommunity, compareGraphNodesByCentrality, extractGraph, graphNodeCentrality, graphNodeIncomingSizeScales, runGraphLayout, type GraphNode, type GraphEdge } from './graph-render'
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

  // ─── view state ─────────────────────────────────────────────────────────
  let viewMode = $state<'canvas' | 'svg' | 'table'>('canvas')
  let canvasLimit = $state(25000)
  let labelFilter = $state('')
  let selectedNode = $state<GraphNode | null>(null)
  let selectedEdge = $state<GraphEdge | null>(null)
  let canvasError = $state<string | null>(null)
  let renderBudget = $state(350)
  let svgZoom = $state(1)
  let canvasPanX = $state(0)
  let canvasPanY = $state(0)
  let canvasPanningPointerId = $state<number | null>(null)
  let canvasPanLastX = 0
  let canvasPanLastY = 0
  let canvasDragMoved = false

  $effect(() => {
    if (subpage === 'svg' && viewMode !== 'svg') viewMode = 'svg'
    else if (subpage === 'graph' && viewMode !== 'canvas') viewMode = 'canvas'
  })
  let hoveredFocusNodeId = $state<string | null>(null)
  let pinnedFocusNodeId = $state<string | null>(null)
  let focusPulseNodeId = $state<string | null>(null)
  let focusPulseStartedAt = $state(0)

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

  // Literal colors so Canvas and SVG do not depend on resolving CSS vars.
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

  function nodeVisualRadius(type: string, incomingScale: number): number {
    const base = Math.max(0.35, Math.min(1.25, sizeForType(type) * 0.14))
    return Math.max(0.35, Math.min(2.5, base * incomingScale))
  }

  const focusEdgeColor = '#d6a72c'
  const focusNodeStrokeColor = '#f4c84a'

  let canvasEl: HTMLCanvasElement | undefined = $state()
  let canvasRaf = 0
  let graphThemeVersion = $state(0)

  onDestroy(() => cancelAnimationFrame(canvasRaf))

  onMount(() => {
    const observer = new MutationObserver(() => {
      graphThemeVersion += 1
      if (viewMode === 'canvas') scheduleCanvasDraw()
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

  function onSelectableKey(e: KeyboardEvent, fn: () => void) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    fn()
  }

  function clampZoom(value: number): number {
    return Math.max(0.5, Math.min(8, value))
  }

  function zoomCanvasAt(nextZoom: number, screenX?: number, screenY?: number) {
    if (!canvasEl) {
      svgZoom = nextZoom
      return
    }
    const rect = canvasEl.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const anchorX = screenX ?? width / 2
    const anchorY = screenY ?? height / 2
    const cx = width / 2
    const cy = height / 2
    const oldZoom = svgZoom
    if (oldZoom !== nextZoom) {
      canvasPanX = anchorX - cx - ((anchorX - cx - canvasPanX) * nextZoom) / oldZoom
      canvasPanY = anchorY - cy - ((anchorY - cy - canvasPanY) * nextZoom) / oldZoom
      svgZoom = nextZoom
      scheduleCanvasDraw()
    }
  }

  function zoomSvg(direction: 'in' | 'out') {
    const factor = direction === 'in' ? 1.25 : 0.8
    const nextZoom = clampZoom(svgZoom * factor)
    if (viewMode === 'canvas') zoomCanvasAt(nextZoom)
    else svgZoom = nextZoom
  }

  function resetSvgZoom() {
    svgZoom = 1
    canvasPanX = 0
    canvasPanY = 0
    if (viewMode === 'canvas') scheduleCanvasDraw()
  }

  function onSvgWheel(e: WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.25 : 0.8
    const nextZoom = clampZoom(svgZoom * factor)
    if (viewMode === 'canvas') {
      const rect = canvasEl?.getBoundingClientRect()
      zoomCanvasAt(
        nextZoom,
        rect ? e.clientX - rect.left : undefined,
        rect ? e.clientY - rect.top : undefined,
      )
    } else {
      svgZoom = nextZoom
    }
  }

  function hitTestCanvasNode(e: MouseEvent | PointerEvent): FallbackSvgNode | null {
    if (!canvasEl) return null
    const rect = canvasEl.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: { node: FallbackSvgNode; d: number } | null = null
    for (const node of fallbackSvgNodes) {
      const p = canvasPoint(node.x, node.y, width, height)
      const d = Math.hypot(p.x - x, p.y - y)
      const hitRadius = Math.max(12, node.r * 5.2 * svgZoom + 5)
      if (d > hitRadius) continue
      if (!best || d < best.d) best = { node, d }
    }
    return best?.node ?? null
  }

  function onCanvasPointerMove(e: PointerEvent) {
    if (canvasPanningPointerId === e.pointerId) {
      const dx = e.clientX - canvasPanLastX
      const dy = e.clientY - canvasPanLastY
      canvasPanLastX = e.clientX
      canvasPanLastY = e.clientY
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        canvasDragMoved = true
        canvasPanX += dx
        canvasPanY += dy
        scheduleCanvasDraw()
      }
      if (canvasEl) canvasEl.style.cursor = 'grabbing'
      return
    }
    if (pinnedFocusNodeId) return
    const node = hitTestCanvasNode(e)
    const nextFocusNodeId = node?.id ?? null
    if (hoveredFocusNodeId !== nextFocusNodeId) hoveredFocusNodeId = nextFocusNodeId
    if (canvasEl) canvasEl.style.cursor = node ? 'pointer' : 'grab'
  }

  function onCanvasPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    if (hitTestCanvasNode(e)) return
    canvasPanningPointerId = e.pointerId
    canvasPanLastX = e.clientX
    canvasPanLastY = e.clientY
    canvasDragMoved = false
    clearGraphFocus()
    clearSelection()
    canvasEl?.setPointerCapture(e.pointerId)
    if (canvasEl) canvasEl.style.cursor = 'grabbing'
    e.preventDefault()
  }

  function stopCanvasPan(e: PointerEvent) {
    if (canvasPanningPointerId !== e.pointerId) return
    canvasPanningPointerId = null
    if (canvasEl?.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId)
    if (canvasEl) canvasEl.style.cursor = 'grab'
  }

  function onCanvasPointerLeave() {
    if (canvasPanningPointerId !== null) return
    if (!pinnedFocusNodeId) hoveredFocusNodeId = null
    if (canvasEl) canvasEl.style.cursor = 'default'
  }

  function onCanvasClick(e: MouseEvent) {
    if (canvasDragMoved) {
      canvasDragMoved = false
      return
    }
    const node = hitTestCanvasNode(e)
    if (node) {
      clickGraphNode(node)
    } else {
      clearGraphFocus()
      clearSelection()
    }
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

  $effect(() => {
    const focusId = activeFocusNodeId
    if (!focusId) return
    if (!fallbackSvgNodeById.has(focusId)) {
      clearGraphFocus()
      return
    }
    focusPulseNodeId = focusId
    focusPulseStartedAt = performance.now()
    if (viewMode === 'canvas') scheduleCanvasDraw()
  })

  const graphTransform = $derived(`translate(50 50) scale(${svgZoom}) translate(-50 -50)`)

  function cssColor(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  }

  function graphCanvasColors() {
    const dark = document.documentElement.dataset.theme === 'dark'
    return {
      background: cssColor('--color-bg-0', dark ? '#050607' : '#ffffff'),
      edge: cssColor('--color-line-3', dark ? '#3a424d' : '#c9cbd1'),
      labelBg: dark ? 'rgba(8, 13, 23, 0.82)' : 'rgba(250, 250, 250, 0.92)',
      labelFg: cssColor('--color-fg-1', dark ? '#e2e8f0' : '#27272a'),
      labelStrong: cssColor('--color-fg-0', dark ? '#ffffff' : '#18181b'),
      edgeLabel: dark ? '#f6d36b' : '#8a6514',
      nodeStroke: dark ? '#ffffff' : '#27272a',
      selectedNodeStroke: dark ? '#0a0a0b' : '#18181b',
    }
  }

  function canvasPoint(x: number, y: number, width: number, height: number) {
    const base = Math.min(width, height) / 100
    const cx = width / 2
    const cy = height / 2
    return {
      x: cx + canvasPanX + (x - 50) * base * svgZoom,
      y: cy + canvasPanY + (y - 50) * base * svgZoom,
    }
  }

  function drawCanvasLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: { primary?: boolean; edge?: boolean } = {},
  ) {
    const label = text.trim()
    if (!label) return
    const colors = graphCanvasColors()

    const size = options.primary ? 12.5 : options.edge ? 10.5 : 11.5
    ctx.font = `${options.primary ? '700' : '600'} ${size}px "JetBrains Mono Variable", monospace`
    const metrics = ctx.measureText(label)
    const paddingX = options.edge ? 5 : 6
    const paddingY = options.edge ? 3 : 4
    const w = metrics.width + paddingX * 2
    const h = size + paddingY * 2
    const rx = Math.max(4, Math.min(7, h / 2))
    const left = x
    const top = y - h / 2

    ctx.save()
    ctx.globalAlpha = options.edge ? 0.9 : 0.94
    ctx.fillStyle = colors.labelBg
    ctx.beginPath()
    ctx.roundRect(left, top, w, h, rx)
    ctx.fill()
    ctx.globalAlpha = options.primary ? 1 : 0.92
    ctx.fillStyle = options.edge ? colors.edgeLabel : options.primary ? colors.labelStrong : colors.labelFg
    ctx.textBaseline = 'middle'
    ctx.fillText(label, left + paddingX, y + 0.5)
    ctx.restore()
  }

  function drawCanvas() {
    if (!canvasEl) return
    const canvas = canvasEl
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      canvasError = '2D canvas context unavailable'
      return
    }
    canvasError = null
    const colors = graphCanvasColors()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = colors.background
    ctx.fillRect(0, 0, width, height)

    const hasFocus = Boolean(activeFocusNodeId)
    const now = performance.now()
    const pulseProgress =
      focusPulseNodeId && focusPulseNodeId === activeFocusNodeId
        ? Math.max(0, 1 - (now - focusPulseStartedAt) / 170)
        : 0

    ctx.save()
    ctx.globalAlpha = hasFocus ? 0.055 : 0.34
    ctx.strokeStyle = colors.edge
    ctx.lineWidth = hasFocus ? 0.55 : 0.75
    ctx.beginPath()
    for (const edge of fallbackSvgEdges) {
      const a = canvasPoint(edge.x1, edge.y1, width, height)
      const b = canvasPoint(edge.x2, edge.y2, width, height)
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
    }
    ctx.stroke()
    ctx.restore()

    if (hasFocus) {
      ctx.save()
      ctx.globalAlpha = 0.96
      ctx.strokeStyle = focusEdgeColor
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (const edge of fallbackSvgEdges) {
        if (!focusEdgeIds.has(edge.id)) continue
        const a = canvasPoint(edge.x1, edge.y1, width, height)
        const b = canvasPoint(edge.x2, edge.y2, width, height)
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
      }
      ctx.stroke()
      ctx.restore()
    }

    if (hasFocus) {
      ctx.save()
      for (const edge of fallbackSvgEdges) {
        if (!focusEdgeIds.has(edge.id)) continue
        const label = (edge.label ?? '').slice(0, 28)
        if (!label) continue
        const a = canvasPoint(edge.x1, edge.y1, width, height)
        const b = canvasPoint(edge.x2, edge.y2, width, height)
        const x = (a.x + b.x) / 2 + 4
        const y = (a.y + b.y) / 2 - 5
        drawCanvasLabel(ctx, label, x, y, { edge: true })
      }
      ctx.restore()
    }

    for (const node of fallbackSvgNodes) {
      const p = canvasPoint(node.x, node.y, width, height)
      const selected = selectedNode?.id === node.id
      const isPrimaryFocus = activeFocusNodeId === node.id
      const isFocusedNeighbor = focusNodeIds.has(node.id)
      const focusScale = !hasFocus
        ? 1
        : isPrimaryFocus
          ? 2.2 + pulseProgress * 0.38
          : isFocusedNeighbor
            ? 1.58
            : 0.9
      const alpha = !hasFocus || isFocusedNeighbor ? 1 : 0.12
      ctx.beginPath()
      ctx.globalAlpha = alpha
      ctx.fillStyle = node.color
      ctx.arc(p.x, p.y, Math.max(2.6, node.r * 5.1 * svgZoom * focusScale), 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = !hasFocus || isFocusedNeighbor ? 1 : 0.16
      ctx.strokeStyle = isPrimaryFocus ? focusNodeStrokeColor : selected ? colors.selectedNodeStroke : colors.nodeStroke
      ctx.lineWidth = isPrimaryFocus ? 3.1 : isFocusedNeighbor ? 1.65 : selected ? 2 : 0.9
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (hasFocus) {
      ctx.save()
      for (const node of fallbackSvgNodes) {
        const isPrimaryFocus = activeFocusNodeId === node.id
        if (!isPrimaryFocus && (!focusNodeIds.has(node.id) || focusNodeIds.size > 36)) continue
        const p = canvasPoint(node.x, node.y, width, height)
        const offset = Math.max(9, node.r * 9 * svgZoom * (isPrimaryFocus ? 2 : 1.25))
        drawCanvasLabel(ctx, node.label.slice(0, 36), p.x + offset, p.y, { primary: isPrimaryFocus })
      }
      ctx.restore()
    }

    if (pulseProgress > 0) {
      canvasRaf = requestAnimationFrame(drawCanvas)
    }
  }

  function scheduleCanvasDraw() {
    cancelAnimationFrame(canvasRaf)
    canvasRaf = requestAnimationFrame(drawCanvas)
  }

  $effect(() => {
    void fallbackSvgNodes
    void fallbackSvgEdges
    void selectedNode
    void svgZoom
    void canvasPanX
    void canvasPanY
    void graphThemeVersion
    void activeFocusNodeId
    void focusNodeIds
    void focusEdgeIds
    if (viewMode === 'canvas') scheduleCanvasDraw()
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
            disabled={svgZoom <= 0.5}
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
            {Math.round(svgZoom * 100)}%
          </button>
          <button
            type="button"
            class="inline-flex h-6 w-7 items-center justify-center text-fg-3 hover:bg-bg-1 hover:text-fg-0 disabled:opacity-40"
            onclick={() => zoomSvg('in')}
            disabled={svgZoom >= 8}
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
          <div>Canvas renderer unavailable. Switch to SVG or Table.</div>
          <div class="mt-0.5 break-words text-fg-3">{canvasError}</div>
        </div>
      </div>
    {/if}

    <!-- Body -->
    <div class="flex-1 min-h-0 relative">
      {#if viewMode === 'canvas'}
        <canvas
          bind:this={canvasEl}
          class="absolute inset-0 h-full w-full bg-bg-0"
          role="button"
          tabindex="0"
          aria-label={`${drawNodes.length} graph nodes and ${drawEdges.length} graph edges`}
          onclick={onCanvasClick}
          onpointerdown={onCanvasPointerDown}
          onpointermove={onCanvasPointerMove}
          onpointerup={stopCanvasPan}
          onpointercancel={stopCanvasPan}
          onpointerleave={onCanvasPointerLeave}
          onkeydown={(event) => { if (event.key === 'Escape') { clearGraphFocus(); clearSelection() } }}
          onwheel={onSvgWheel}
        ></canvas>
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
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={svgNodeRadius(n)}
                    fill={n.color}
                    opacity={svgNodeOpacity(n)}
                    stroke={activeFocusNodeId === n.id ? focusNodeStrokeColor : selectedNode?.id === n.id ? '#0a0a0b' : '#ffffff'}
                    stroke-width={activeFocusNodeId === n.id ? '0.55' : focusNodeIds.has(n.id) ? '0.22' : selectedNode?.id === n.id ? '0.4' : '0.14'}
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
            <button type="button" onclick={() => { clearGraphFocus(); clearSelection() }} aria-label="Close panel" class="text-fg-3 hover:text-fg-1 cursor-pointer">
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
</style>
