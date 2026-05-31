<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import GraphRenderer from '$lib/renderers/GraphRenderer.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import {
    loadGraphContract,
    parseGraphContract,
    contractToQueryResult,
    GraphContractError,
    type GraphContract,
  } from '$lib/graph-loader'
  import type { QueryResult } from '#reddb'
  import { Share2, FileUp, Loader2, AlertTriangle } from 'lucide-svelte'

  // The universal viewer: render any contract-conformant graph.json from a
  // path or URL (`?src=…`) or a dropped/picked file — no live connection.
  let src = $state('')
  let loading = $state(false)
  let error = $state<string | null>(null)
  let contract = $state<GraphContract | null>(null)
  let sourceLabel = $state('')

  const result = $derived<QueryResult | null>(contract ? contractToQueryResult(contract) : null)

  async function loadFrom(source: string) {
    loading = true
    error = null
    contract = null
    try {
      const loaded = await loadGraphContract(source)
      contract = loaded
      sourceLabel = source
    } catch (e) {
      error = e instanceof GraphContractError ? e.message : (e as Error).message
    } finally {
      loading = false
    }
  }

  async function loadFile(file: File) {
    loading = true
    error = null
    contract = null
    try {
      contract = parseGraphContract(JSON.parse(await file.text()))
      sourceLabel = file.name
    } catch (e) {
      error =
        e instanceof GraphContractError
          ? e.message
          : `Could not read "${file.name}": ${(e as Error).message}`
    } finally {
      loading = false
    }
  }

  function submitSrc(e: SubmitEvent) {
    e.preventDefault()
    if (!src.trim()) return
    goto(`/graph?src=${encodeURIComponent(src.trim())}`)
  }

  let dragOver = $state(false)
  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    const file = e.dataTransfer?.files?.[0]
    if (file) void loadFile(file)
  }

  // Auto-load whenever `?src=` is present or changes.
  $effect(() => {
    const param = page.url.searchParams.get('src')
    if (param) {
      src = param
      void loadFrom(param)
    }
  })
</script>

<div class="h-full flex flex-col p-6 gap-4 overflow-hidden">
  <PageHeader
    eyebrow="Explore"
    title="Graph viewer"
    subtitle="Render any contract-conformant graph.json from a path or URL — memory exports, codebase graphs, graphify output."
  >
    {#if contract}
      <span class="type-caption font-mono"
        >{contract.stats.node_count} nodes · {contract.stats.edge_count} edges</span
      >
    {/if}
  </PageHeader>

  <form onsubmit={submitSrc} class="flex items-center gap-2 shrink-0">
    <div class="relative flex-1">
      <Share2 class="size-4 text-fg-3 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        bind:value={src}
        placeholder="/graph.json or https://…/graph.json"
        spellcheck="false"
        class="w-full pl-9 pr-3 py-2 bg-bg-1 border border-line-1 rounded-md font-mono text-[13px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-accent"
      />
    </div>
    <button
      type="submit"
      disabled={loading || !src.trim()}
      class="px-3 py-2 bg-accent text-white rounded-md text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
    >
      {#if loading}<Loader2 class="size-4 animate-spin" />{:else}Load{/if}
    </button>
    <label
      class="px-3 py-2 bg-bg-1 border border-line-1 rounded-md text-[13px] text-fg-2 hover:text-fg-1 hover:border-line-2 cursor-pointer flex items-center gap-1.5"
    >
      <FileUp class="size-4" /> File
      <input
        type="file"
        accept="application/json,.json"
        class="hidden"
        onchange={(e) => {
          const f = e.currentTarget.files?.[0]
          if (f) void loadFile(f)
        }}
      />
    </label>
  </form>

  <div
    class="flex-1 min-h-0 relative"
    role="region"
    aria-label="Graph drop target"
    ondragover={(e) => {
      e.preventDefault()
      dragOver = true
    }}
    ondragleave={() => (dragOver = false)}
    ondrop={onDrop}
  >
    {#if result}
      <div class="h-full rounded-lg border border-line-1 overflow-hidden">
        <GraphRenderer {result} collection={sourceLabel} />
      </div>
    {:else if loading}
      <EmptyState title="Loading graph…" icon={Loader2} message={`Fetching ${sourceLabel || src}`} />
    {:else if error}
      <EmptyState
        title="Could not load graph"
        icon={AlertTriangle}
        message={error}
        hint="Expected a graph.json conforming to contract v1.0.0"
      />
    {:else}
      <EmptyState
        title="No graph loaded"
        icon={Share2}
        message="Enter a path or URL above, pick a file, or drop a graph.json here."
        hint="?src=/path/to/graph.json"
      />
    {/if}

    {#if dragOver}
      <div
        class="absolute inset-0 bg-bg-0/80 border-2 border-dashed border-accent rounded-lg flex items-center justify-center pointer-events-none z-10"
      >
        <span class="type-h2 text-accent">Drop graph.json to render</span>
      </div>
    {/if}
  </div>
</div>
