<script lang="ts">
  import { Button as DSButton, Input as DSInput } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Box from '@lucide/svelte/icons/box'
  import ChevronRight from '@lucide/svelte/icons/chevron-right'
  import CircleDot from '@lucide/svelte/icons/circle-dot'
  import FileJson from '@lucide/svelte/icons/file-json'
  import Layers3 from '@lucide/svelte/icons/layers-3'
  import Link2 from '@lucide/svelte/icons/link-2'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import Upload from '@lucide/svelte/icons/upload'
  import GraphRenderer from '../../lib/renderers/GraphRenderer.svelte'
  import EmptyState from '../../lib/EmptyState.svelte'
  import {
    loadGraphExport,
    parseGraphExportJson,
    type LoadedGraph,
  } from '../../lib/graph-loader/contract'
  import {
    buildGraphDrilldown,
    graphResultForNodeIds,
    type DrilldownComponent,
    type DrilldownLayer,
  } from '../../lib/graph-loader/drilldown'

  let loaded = $state<LoadedGraph | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let sourceLabel = $state<string | null>(null)
  let selectedLayerId = $state<string | null>(null)
  let selectedComponentId = $state<string | null>(null)

  let srcInput = $state('')
  let fileInput = $state<HTMLInputElement>()

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
      class="flex items-center justify-between gap-4 px-3 py-2 border-b border-muted bg-elevation-base-surface shrink-0"
    >
      <span class="flex items-center gap-2 min-w-0 text-ink-muted text-[13px]">
        <DSIcon icon={FileJson} color="current" size="sm" />
        <span class="font-mono text-foreground truncate max-w-[38vw]">{sourceLabel}</span>
        <span class="text-ink-muted whitespace-nowrap">
          {loaded.model.nodes.length} nodes · {loaded.model.edges.length} edges{#if loaded.model.communities.length}
            · {loaded.model.communities.length} communities{/if}
        </span>
      </span>
      <DSButton variant="ghost" size="sm"
        type="button"

        onclick={clear}
      >
        <DSIcon icon={RotateCw} color="current" size="sm" /> Load another
      </DSButton>
    </div>
    <div class="flex-1 min-h-0 flex">
      <aside
        class="w-[min(320px,48vw)] shrink-0 border-r border-muted bg-elevation-base-surface/80 flex flex-col min-h-0"
      >
        <div class="px-3 py-2 border-b border-muted">
          <div class="flex items-center gap-2 text-foreground">
            {#if selectedLayer}
              <DSButton variant="secondary" size="sm"
                type="button"
                aria-label="Back"

                onclick={goBack}
              >
                <DSIcon icon={ArrowLeft} color="current" size="sm" />
              </DSButton>
            {:else}
              <span class="inline-flex size-6 items-center justify-center rounded border border-muted text-ink-muted">
                <DSIcon icon={Layers3} color="current" size="sm" />
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
              <div class="truncate text-[12px] font-medium text-foreground">
                {selectedComponent?.label ?? selectedLayer?.label ?? 'Layers and communities'}
              </div>
            </div>
          </div>

          <nav class="mt-2 flex min-w-0 items-center gap-1 text-[11px] font-mono text-ink-muted">
            <DSButton variant="ghost"
              type="button"
              class={[
                'truncate rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground',
                !selectedLayer ? 'text-foreground bg-muted' : '',
              ].join(' ')}
              onclick={resetDrilldown}
            >
              overview
            </DSButton>
            {#if selectedLayer}
              <DSIcon icon={ChevronRight} color="current" size="sm" class="shrink-0" />
              <DSButton variant="ghost"
                type="button"
                class={[
                  'truncate rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground',
                  selectedLayer && !selectedComponent ? 'text-foreground bg-muted' : '',
                ].join(' ')}
                onclick={() => (selectedComponentId = null)}
              >
                {selectedLayer.label}
              </DSButton>
            {/if}
            {#if selectedComponent}
              <DSIcon icon={ChevronRight} color="current" size="sm" class="shrink-0" />
              <span class="truncate rounded bg-muted px-1.5 py-0.5 text-foreground">
                {selectedComponent.label}
              </span>
            {/if}
          </nav>
        </div>

        {#if drilldown}
          <div class="flex-1 min-h-0 overflow-auto">
            {#if !selectedLayer}
              <div class="px-3 py-2 text-[11px] font-mono text-ink-muted border-b border-muted">
                {countLabel(drilldown.layers.length, 'group')} · {countLabel(
                  loaded.model.nodes.length,
                  'node',
                )}
              </div>
              <div class="divide-y divide-line-1">
                {#each drilldown.layers as layer}
                  <DSButton variant="ghost" size="sm"
                    type="button"
                    class="w-full text-left"
                    onclick={() => selectLayer(layer)}
                  >
                    <div class="flex items-start gap-2.5">
                      <span
                        class="mt-1.5 size-2 rounded-full shrink-0"
                        style={`background:${layer.color};box-shadow:0 0 8px ${layer.color}`}
                      ></span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-2">
                          <span class="truncate text-[13px] font-medium text-foreground">
                            {layer.label}
                          </span>
                          <span class="font-mono text-[10px] text-ink-muted">
                            {countLabel(layer.componentCount, 'component')}
                          </span>
                        </span>
                        <span class="mt-1 block font-mono text-[11px] text-ink-muted">
                          {countLabel(layer.nodeCount, 'node')} · {connectionLabel(layer)}
                        </span>
                      </span>
                      <DSIcon icon={ChevronRight} color="current" size="sm" class="mt-1 shrink-0 text-ink-muted" />
                    </div>
                  </DSButton>
                {/each}
              </div>
            {:else if !selectedComponent}
              <div class="px-3 py-2 text-[11px] font-mono text-ink-muted border-b border-muted">
                {countLabel(
                  selectedLayer.components.length,
                  'component',
                )} · {countLabel(selectedLayer.nodeCount, 'node')}
              </div>
              <div class="divide-y divide-line-1">
                {#each selectedLayer.components as component}
                  <DSButton variant="ghost" size="sm"
                    type="button"
                    class="w-full text-left"
                    onclick={() => selectComponent(component)}
                  >
                    <div class="flex items-start gap-2.5">
                      <span class="mt-1 text-ink-muted"><DSIcon icon={Box} color="current" size="sm" /></span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[13px] font-medium text-foreground">
                          {component.label}
                        </span>
                        <span class="mt-1 block font-mono text-[11px] text-ink-muted">
                          {countLabel(component.nodeCount, 'node')} · {connectionLabel(component)}
                        </span>
                      </span>
                      <DSIcon icon={ChevronRight} color="current" size="sm" class="mt-1 shrink-0 text-ink-muted" />
                    </div>
                  </DSButton>
                {/each}
              </div>
            {:else}
              <div class="px-3 py-2 text-[11px] font-mono text-ink-muted border-b border-muted">
                {countLabel(selectedComponent.nodes.length, 'node')} · {connectionLabel(
                  selectedComponent,
                )}
              </div>
              <div class="divide-y divide-line-1">
                {#each selectedComponent.nodes as node}
                  <div class="px-3 py-2.5">
                    <div class="flex items-start gap-2.5">
                      <span class="mt-1 text-ink-muted"><DSIcon icon={CircleDot} color="current" size="sm" /></span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[13px] font-medium text-foreground">
                          {node.label}
                        </span>
                        <span class="mt-1 block truncate font-mono text-[11px] text-ink-muted">
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
                <DSIcon icon={Link2} color="current" size="sm" class="absolute left-2.5 text-ink-muted pointer-events-none" />
                <DSInput
                  class="w-full"
                  type="text"
                  placeholder="https://host/graph.json  or  /exports/memory.json"
                  bind:value={srcInput}
                  disabled={loading}
                  spellcheck="false"
                  autocapitalize="off"
                  autocorrect="off"
                />
              </div>
              <DSButton variant="primary" size="sm"

                type="submit"
                disabled={loading || !srcInput.trim()}
              >
                {loading ? 'Loading…' : 'Load'}
              </DSButton>
            </form>

            <div class="flex items-center gap-2 text-ink-muted text-[11px] uppercase tracking-wide">
              <span class="flex-1 h-px bg-line-1"></span>
              or
              <span class="flex-1 h-px bg-line-1"></span>
            </div>

            <DSButton variant="ghost" size="sm"
              type="button"

              disabled={loading}
              onclick={() => fileInput?.click()}
            >
              <DSIcon icon={Upload} color="current" size="sm" /> Choose a local graph.json
            </DSButton>
            <DSInput
              bind:ref={fileInput}
              type="file"
              accept="application/json,.json"
              class="hidden"
              onchange={onFileChange}
            />

            {#if error}
              <p
                class="m-0 px-3 py-2 rounded-md text-primary-text text-[12px] leading-relaxed border border-primary/35 bg-primary/10"
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
