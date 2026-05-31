<script lang="ts">
  import type { QueryResult } from '#reddb'
  import { Braces, FileText, Search, X } from 'lucide-svelte'
  import { extractDocuments, type DocumentItem } from './document-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  let mode = $state<'body' | 'fields' | 'raw'>('body')
  let filter = $state('')
  let selected = $state<DocumentItem | null>(null)

  const docs = $derived(extractDocuments(result))
  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return docs
    return docs.filter((doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.subtitle.toLowerCase().includes(q) ||
      JSON.stringify(doc.body).toLowerCase().includes(q),
    )
  })
  const active = $derived(selected && filtered.includes(selected) ? selected : filtered[0] ?? null)

  function pretty(v: unknown): string {
    return JSON.stringify(v ?? null, null, 2)
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if docs.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No document shape in this result.
    </div>
  {:else}
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors', mode === 'body' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'body')}
          aria-pressed={mode === 'body'}
        >
          <Braces class="size-3" />
          body
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'fields' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'fields')}
          aria-pressed={mode === 'fields'}
        >
          <FileText class="size-3" />
          fields
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
        <input type="text" bind:value={filter} placeholder="document search…" class="bg-transparent text-fg-1 outline-none w-[200px] placeholder:text-fg-3" />
        {#if filter}
          <button type="button" onclick={() => (filter = '')} class="text-fg-3 hover:text-fg-1 cursor-pointer" aria-label="Clear document filter">
            <X class="size-3" />
          </button>
        {/if}
      </div>

      <div class="ml-auto text-fg-3">
        {filtered.length.toLocaleString()}{#if filter} of {docs.length.toLocaleString()}{/if} documents
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </div>
    </div>

    <div class="flex-1 min-h-0 grid grid-cols-[minmax(280px,0.75fr)_1.25fr]">
      <div class="overflow-auto border-r border-line-1 text-[12px] font-mono">
        {#each filtered as doc (doc.rid)}
          <button
            type="button"
            onclick={() => (selected = doc)}
            class={['w-full text-left px-3 py-2 border-b border-line-1/60 hover:bg-bg-1/50 cursor-pointer', active === doc ? 'bg-bg-1 text-fg-0' : 'text-fg-2'].join(' ')}
          >
            <div class="flex items-center gap-2">
              <span class="text-accent truncate">{doc.title}</span>
              <span class="ml-auto text-fg-3">#{doc.rid}</span>
            </div>
            {#if doc.subtitle}
              <div class="mt-1 truncate text-fg-3">{doc.subtitle}</div>
            {/if}
          </button>
        {/each}
      </div>

      <div class="min-h-0 overflow-auto p-3 text-[12px] font-mono">
        {#if active}
          {#if mode === 'body'}
            <pre class="m-0 whitespace-pre-wrap text-fg-1">{pretty(active.body)}</pre>
          {:else if mode === 'fields'}
            <table class="w-full border-collapse">
              <tbody>
                {#each Object.entries(active.fields) as [key, value] (key)}
                  <tr class="border-b border-line-1/60">
                    <td class="w-[180px] px-2 py-1 text-fg-3 align-top">{key}</td>
                    <td class="px-2 py-1 text-fg-1 align-top"><pre class="m-0 whitespace-pre-wrap">{pretty(value)}</pre></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <pre class="m-0 whitespace-pre-wrap text-fg-1">{pretty(active.values)}</pre>
          {/if}
        {:else}
          <div class="text-fg-3">No documents match the current filter.</div>
        {/if}
      </div>
    </div>

    <div class="border-t border-line-1 px-3 py-1.5 text-[10px] font-mono text-fg-3">
      {docs.length} documents{collection ? ' · ' : ''}{collection ?? ''}
    </div>
  {/if}
</div>
