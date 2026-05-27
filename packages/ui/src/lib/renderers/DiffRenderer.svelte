<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { Braces, GitCompareArrows, Search, X } from 'lucide-svelte'
  import { extractDiffEntries, formatDiffValue, summarizeDiff, type DiffEntry } from './diff-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  let mode = $state<'summary' | 'raw'>('summary')
  let filter = $state('')
  let selected = $state<DiffEntry | null>(null)

  const entries = $derived(extractDiffEntries(result))
  const summary = $derived(summarizeDiff(entries))
  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((entry) =>
      entry.id.toLowerCase().includes(q) ||
      entry.change.toLowerCase().includes(q) ||
      (entry.collection ?? '').toLowerCase().includes(q) ||
      (entry.entityId ?? '').toLowerCase().includes(q) ||
      formatDiffValue(entry.before).toLowerCase().includes(q) ||
      formatDiffValue(entry.after).toLowerCase().includes(q),
    )
  })
  const active = $derived(selected ?? filtered[0] ?? null)
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if entries.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No diff shape in this result.
    </div>
  {:else}
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors', mode === 'summary' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'summary')}
          aria-pressed={mode === 'summary'}
        >
          <GitCompareArrows class="size-3" />
          diff
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'raw' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'raw')}
          aria-pressed={mode === 'raw'}
        >
          <Braces class="size-3" />
          raw
        </button>
      </div>

      <div class="inline-flex items-center gap-1.5 border border-line-1 rounded px-2 py-1 bg-bg-0">
        <Search class="size-3 text-fg-3" />
        <input type="text" bind:value={filter} placeholder="change, id, value…" class="bg-transparent text-fg-1 outline-none w-[190px] placeholder:text-fg-3" />
        {#if filter}
          <button type="button" onclick={() => (filter = '')} class="text-fg-3 hover:text-fg-1 cursor-pointer" aria-label="Clear diff filter">
            <X class="size-3" />
          </button>
        {/if}
      </div>

      <div class="ml-auto flex items-center gap-3 text-fg-3">
        {#each summary as [change, count] (change)}
          <span><span class="text-fg-2">{change}</span> {count}</span>
        {/each}
        {#if collection}<span class="text-fg-2">{collection}</span>{/if}
      </div>
    </div>

    {#if mode === 'raw'}
      <div class="flex-1 overflow-auto p-3 text-[12px] font-mono">
        <pre class="whitespace-pre-wrap text-fg-1">{JSON.stringify(filtered.map((entry) => entry.values), null, 2)}</pre>
      </div>
    {:else}
      <div class="flex-1 min-h-0 grid grid-cols-[minmax(320px,0.9fr)_1.1fr]">
        <div class="overflow-auto border-r border-line-1 text-[12px] font-mono">
          {#each filtered as entry (entry.id)}
            <button
              type="button"
              onclick={() => (selected = entry)}
              class={['w-full text-left px-3 py-2 border-b border-line-1/60 hover:bg-bg-1/50 cursor-pointer', active === entry ? 'bg-bg-1 text-fg-0' : 'text-fg-2'].join(' ')}
            >
              <div class="flex items-center gap-2">
                <span class="text-accent">{entry.change}</span>
                <span class="text-fg-3 truncate">{entry.entityId ?? entry.id}</span>
                {#if entry.collection}<span class="ml-auto text-fg-3">{entry.collection}</span>{/if}
              </div>
              {#if entry.note}
                <div class="mt-1 truncate text-fg-1">{entry.note}</div>
              {/if}
            </button>
          {/each}
        </div>

        <div class="overflow-auto p-3 text-[12px] font-mono">
          {#if active}
            <div class="mb-3 grid grid-cols-[100px_1fr] gap-x-3 gap-y-1">
              <span class="text-fg-3">change</span><span class="text-accent">{active.change}</span>
              <span class="text-fg-3">entity</span><span class="text-fg-0">{active.entityId ?? active.id}</span>
              <span class="text-fg-3">collection</span><span class="text-fg-0">{active.collection ?? '-'}</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <section class="min-w-0">
                <div class="type-label mb-1">before</div>
                <pre class="min-h-[160px] whitespace-pre-wrap break-words rounded border border-line-1 bg-bg-1 p-2 text-fg-1">{formatDiffValue(active.before)}</pre>
              </section>
              <section class="min-w-0">
                <div class="type-label mb-1">after</div>
                <pre class="min-h-[160px] whitespace-pre-wrap break-words rounded border border-line-1 bg-bg-1 p-2 text-fg-1">{formatDiffValue(active.after)}</pre>
              </section>
            </div>
          {:else}
            <div class="text-fg-3">No diff entry selected.</div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
