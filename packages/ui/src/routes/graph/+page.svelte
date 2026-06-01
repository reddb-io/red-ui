<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import {
    ArrowLeft,
    Box,
    ChevronRight,
    CircleDot,
    FileJson,
    Layers3,
    Link2,
    RotateCw,
    Upload,
  } from 'lucide-svelte'
  import GraphRenderer from '$lib/renderers/GraphRenderer.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import {
    loadGraphExport,
    parseGraphExportJson,
    type LoadedGraph,
  } from '$lib/graph-loader/contract'
  import {
    buildGraphDrilldown,
    graphResultForNodeIds,
    type DrilldownComponent,
    type DrilldownLayer,
  } from '$lib/graph-loader/drilldown'

  let loaded = $state<LoadedGraph | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let sourceLabel = $state<string | null>(null)
  let selectedLayerId = $state<string | null>(null)
  let selectedComponentId = $state<string | null>(null)

  let srcInput = $state('')
  let fileInput = $state<HTMLInputElement | null>(null)

  const drilldown = $derived(loaded ? buildGraphDrilldown(loaded.model) : null)
  const selectedLayer = $derived(
    selectedLayerId
      ? drilldown?.layers.find((layer) => layer.id === selectedLayerId)
      : undefined,
  )
  const selectedComponent = $derived(
    selectedComponentId
      ? selectedLayer?.components.find(
          (component) => component.id === selectedComponentId,
        )
      : undefined,
  )
  const visibleNodeIds = $derived.by(() => {
    if (selectedComponent) return selectedComponent.nodeIds
    if (selectedLayer) return selectedLayer.nodeIds
    return null
  })
  const visibleResult = $derived(
    loaded ? graphResultForNodeIds(loaded.model, visibleNodeIds) : null,
  )
  const graphKey = $derived(
    `${sourceLabel ?? 'graph'}:${selectedLayerId ?? 'overview'}:${selectedComponentId ?? 'all'}`,
  )

  async function loadFromUrl(src: string) {
    const trimmed = src.trim()
    if (!trimmed) return
    loading = true
    error = null
    try {
      loaded = await loadGraphExport(trimmed, { fetch })
      sourceLabel = trimmed
      resetDrilldown()
    } catch (e) {
      loaded = null
      error = e instanceof Error ? e.message : String(e)
    } finally {
      loading = false
    }
  }

  async function loadFromFile(file: File) {
    loading = true
    error = null
    try {
      loaded = parseGraphExportJson(await file.text())
      sourceLabel = file.name
      resetDrilldown()
    } catch (e) {
      loaded = null
      error = e instanceof Error ? e.message : String(e)
    } finally {
      loading = false
    }
  }

  function onSubmit(event: SubmitEvent) {
    event.preventDefault()
    void loadFromUrl(srcInput)
  }

  function onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) void loadFromFile(file)
  }

  function clear() {
    loaded = null
    error = null
    sourceLabel = null
    srcInput = ''
    resetDrilldown()
    if (fileInput) fileInput.value = ''
  }

  function resetDrilldown() {
    selectedLayerId = null
    selectedComponentId = null
  }

  function selectLayer(layer: DrilldownLayer) {
    selectedLayerId = layer.id
    selectedComponentId = null
  }

  function selectComponent(component: DrilldownComponent) {
    selectedComponentId = component.id
  }

  function goBack() {
    if (selectedComponentId) {
      selectedComponentId = null
      return
    }
    selectedLayerId = null
  }

  function countLabel(count: number, noun: string): string {
    return `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`
  }

  function connectionLabel(item: {
    connectionCount: number
    externalConnectionCount: number
  }): string {
    const base = countLabel(item.connectionCount, 'connection')
    if (item.externalConnectionCount === 0) return base
    return `${base} · ${item.externalConnectionCount.toLocaleString()} external`
  }

  onMount(() => {
    // Deep-linkable: /graph?src=<path-or-url>
    const src = page.url.searchParams.get('src')
    if (src) {
      srcInput = src
      void loadFromUrl(src)
    }
  })
</script>

<svelte:head>
  <title>Load graph · red-ui</title>
</svelte:head>

<div class="flex h-screen w-full flex-col">
  {#if loaded}
    <div
      class="flex items-center justify-between gap-4 px-3 py-2 border-b border-line-1 bg-bg-1 shrink-0"
    >
      <span class="flex items-center gap-2 min-w-0 text-fg-2 text-[13px]">
        <FileJson size={14} />
        <span class="font-mono text-fg-1 truncate max-w-[38vw]">{sourceLabel}</span>
        <span class="text-fg-3 whitespace-nowrap">
          {loaded.model.nodes.length} nodes · {loaded.model.edges.length} edges{#if loaded.model.communities.length}
            · {loaded.model.communities.length} communities{/if}
        </span>
      </span>
      <button
        type="button"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line-1 text-fg-2 text-[12px] hover:border-fg-3 hover:text-fg-1"
        onclick={clear}
      >
        <RotateCw size={13} /> Load another
      </button>
    </div>
    <div class="flex-1 min-h-0 flex">
      <aside
        class="w-[min(320px,48vw)] shrink-0 border-r border-line-1 bg-bg-1/80 flex flex-col min-h-0"
      >
        <div class="px-3 py-2 border-b border-line-1">
          <div class="flex items-center gap-2 text-fg-1">
            {#if selectedLayer}
              <button
                type="button"
                aria-label="Back"
                class="inline-flex size-6 items-center justify-center rounded border border-line-1 text-fg-3 hover:border-line-2 hover:text-fg-1"
                onclick={goBack}
              >
                <ArrowLeft size={13} />
              </button>
            {:else}
              <span class="inline-flex size-6 items-center justify-center rounded border border-line-1 text-fg-3">
                <Layers3 size={13} />
              </span>
            {/if}
            <div class="min-w-0">
              <div class="type-label">
                {#if selectedComponent}
                  nodes
                {:else if selectedLayer}
                  components
                {:else}
                  overview
                {/if}
              </div>
              <div class="truncate text-[12px] font-medium text-fg-0">
                {selectedComponent?.label ?? selectedLayer?.label ?? 'Layers and communities'}
              </div>
            </div>
          </div>

          <nav class="mt-2 flex min-w-0 items-center gap-1 text-[11px] font-mono text-fg-3">
            <button
              type="button"
              class={[
                'truncate rounded px-1.5 py-0.5 hover:bg-bg-2 hover:text-fg-1',
                !selectedLayer ? 'text-fg-0 bg-bg-2' : '',
              ].join(' ')}
              onclick={resetDrilldown}
            >
              overview
            </button>
            {#if selectedLayer}
              <ChevronRight size={12} class="shrink-0" />
              <button
                type="button"
                class={[
                  'truncate rounded px-1.5 py-0.5 hover:bg-bg-2 hover:text-fg-1',
                  selectedLayer && !selectedComponent ? 'text-fg-0 bg-bg-2' : '',
                ].join(' ')}
                onclick={() => (selectedComponentId = null)}
              >
                {selectedLayer.label}
              </button>
            {/if}
            {#if selectedComponent}
              <ChevronRight size={12} class="shrink-0" />
              <span class="truncate rounded bg-bg-2 px-1.5 py-0.5 text-fg-0">
                {selectedComponent.label}
              </span>
            {/if}
          </nav>
        </div>

        {#if drilldown}
          <div class="flex-1 min-h-0 overflow-auto">
            {#if !selectedLayer}
              <div class="px-3 py-2 text-[11px] font-mono text-fg-3 border-b border-line-1">
                {countLabel(drilldown.layers.length, 'group')} · {countLabel(
                  loaded.model.nodes.length,
                  'node',
                )}
              </div>
              <div class="divide-y divide-line-1">
                {#each drilldown.layers as layer}
                  <button
                    type="button"
                    class="w-full px-3 py-2.5 text-left hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    onclick={() => selectLayer(layer)}
                  >
                    <div class="flex items-start gap-2.5">
                      <span
                        class="mt-1.5 size-2 rounded-full shrink-0"
                        style={`background:${layer.color};box-shadow:0 0 8px ${layer.color}`}
                      ></span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-2">
                          <span class="truncate text-[13px] font-medium text-fg-0">
                            {layer.label}
                          </span>
                          <span class="font-mono text-[10px] text-fg-3">
                            {countLabel(layer.componentCount, 'component')}
                          </span>
                        </span>
                        <span class="mt-1 block font-mono text-[11px] text-fg-3">
                          {countLabel(layer.nodeCount, 'node')} · {connectionLabel(layer)}
                        </span>
                      </span>
                      <ChevronRight size={14} class="mt-1 shrink-0 text-fg-3" />
                    </div>
                  </button>
                {/each}
              </div>
            {:else if !selectedComponent}
              <div class="px-3 py-2 text-[11px] font-mono text-fg-3 border-b border-line-1">
                {countLabel(
                  selectedLayer.components.length,
                  'component',
                )} · {countLabel(selectedLayer.nodeCount, 'node')}
              </div>
              <div class="divide-y divide-line-1">
                {#each selectedLayer.components as component}
                  <button
                    type="button"
                    class="w-full px-3 py-2.5 text-left hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    onclick={() => selectComponent(component)}
                  >
                    <div class="flex items-start gap-2.5">
                      <span class="mt-1 text-fg-3"><Box size={14} /></span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[13px] font-medium text-fg-0">
                          {component.label}
                        </span>
                        <span class="mt-1 block font-mono text-[11px] text-fg-3">
                          {countLabel(component.nodeCount, 'node')} · {connectionLabel(component)}
                        </span>
                      </span>
                      <ChevronRight size={14} class="mt-1 shrink-0 text-fg-3" />
                    </div>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="px-3 py-2 text-[11px] font-mono text-fg-3 border-b border-line-1">
                {countLabel(selectedComponent.nodes.length, 'node')} · {connectionLabel(
                  selectedComponent,
                )}
              </div>
              <div class="divide-y divide-line-1">
                {#each selectedComponent.nodes as node}
                  <div class="px-3 py-2.5">
                    <div class="flex items-start gap-2.5">
                      <span class="mt-1 text-fg-3"><CircleDot size={13} /></span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[13px] font-medium text-fg-0">
                          {node.label}
                        </span>
                        <span class="mt-1 block truncate font-mono text-[11px] text-fg-3">
                          {node.type} · degree {node.degree.toLocaleString()} · {node.id}
                        </span>
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </aside>

      <div class="flex-1 min-w-0">
        {#if visibleResult}
          {#key graphKey}
            <GraphRenderer result={visibleResult} />
          {/key}
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-center h-full w-full p-8">
      <EmptyState
        title="Load a graph"
        message="Render any contract-conformant graph.json — memory exports, codebase graphs, or graphify output — from a URL, a path, or a local file. No connection required."
        icon={FileJson}
      >
        {#snippet actions()}
          <div class="flex flex-col gap-3 w-[min(34rem,90vw)] text-left">
            <form class="flex gap-2" onsubmit={onSubmit}>
              <div class="relative flex-1 flex items-center">
                <Link2 size={15} class="absolute left-2.5 text-fg-3 pointer-events-none" />
                <input
                  class="w-full pl-8 pr-2.5 py-2 bg-bg-2 border border-line-1 rounded-md text-fg-1 text-[13px] font-mono focus:outline-none focus:border-accent"
                  type="text"
                  placeholder="https://host/graph.json  or  /exports/memory.json"
                  bind:value={srcInput}
                  disabled={loading}
                  spellcheck="false"
                  autocapitalize="off"
                  autocorrect="off"
                />
              </div>
              <button
                class="px-4 py-2 bg-accent text-white rounded-md text-[13px] font-medium whitespace-nowrap disabled:opacity-50"
                type="submit"
                disabled={loading || !srcInput.trim()}
              >
                {loading ? 'Loading…' : 'Load'}
              </button>
            </form>

            <div class="flex items-center gap-2 text-fg-3 text-[11px] uppercase tracking-wide">
              <span class="flex-1 h-px bg-line-1"></span>
              or
              <span class="flex-1 h-px bg-line-1"></span>
            </div>

            <button
              type="button"
              class="flex items-center justify-center gap-2 px-3 py-2 bg-bg-2 border border-line-1 rounded-md text-fg-1 text-[13px] hover:border-fg-3 disabled:opacity-50"
              disabled={loading}
              onclick={() => fileInput?.click()}
            >
              <Upload size={15} /> Choose a local graph.json
            </button>
            <input
              bind:this={fileInput}
              type="file"
              accept="application/json,.json"
              class="hidden"
              onchange={onFileChange}
            />

            {#if error}
              <p
                class="m-0 px-3 py-2 rounded-md text-accent text-[12px] leading-relaxed border border-accent/35 bg-accent/10"
              >
                {error}
              </p>
            {/if}
          </div>
        {/snippet}
      </EmptyState>
    </div>
  {/if}
</div>
