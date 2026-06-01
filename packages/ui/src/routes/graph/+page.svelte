<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { FileJson, Link2, Upload, RotateCw } from 'lucide-svelte'
  import GraphRenderer from '$lib/renderers/GraphRenderer.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import {
    loadGraphExport,
    parseGraphExportJson,
    type LoadedGraph,
  } from '$lib/graph-loader/contract'

  let loaded = $state<LoadedGraph | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let sourceLabel = $state<string | null>(null)

  let srcInput = $state('')
  let fileInput = $state<HTMLInputElement | null>(null)

  async function loadFromUrl(src: string) {
    const trimmed = src.trim()
    if (!trimmed) return
    loading = true
    error = null
    try {
      loaded = await loadGraphExport(trimmed, { fetch })
      sourceLabel = trimmed
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
    if (fileInput) fileInput.value = ''
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

<div class="flex flex-col h-full w-full">
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
    <div class="flex-1 min-h-0">
      {#key loaded}
        <GraphRenderer result={loaded.result} />
      {/key}
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
