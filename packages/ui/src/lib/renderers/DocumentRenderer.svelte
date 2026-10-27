<script lang="ts">
  import { tick } from 'svelte'
  import { Button } from '@reddb-io/design-system/base'
  import { documentCollectionEmptyCompact, searchEmpty } from '@reddb-io/design-system/base/illustrations'
  import { collectionPageHref } from '$lib/collection-pages'
  import RendererEmptyState from './RendererEmptyState.svelte'
  import type { QueryResult } from '#reddb'
  import Braces from '@lucide/svelte/icons/braces'
  import FileText from '@lucide/svelte/icons/file-text'
  import Search from '@lucide/svelte/icons/search'
  import X from '@lucide/svelte/icons/x'
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

  let root: HTMLDivElement
  async function clearFilter() {
    filter = ''
    selected = null
    await tick()
    root.querySelector<HTMLInputElement>('[data-document-filter]')?.focus()
  }
  function pretty(v: unknown): string {
    return JSON.stringify(v ?? null, null, 2)
  }
</script>

<div bind:this={root} data-renderer="document" class="flex h-full flex-col text-fg-1">
  {#if !result.ok}
    <div role="alert" class="grid flex-1 place-items-center p-6 text-[12px] font-mono text-fg-3">{result.error ?? 'Query failed.'}</div>
  {:else if docs.length === 0}
    <RendererEmptyState surface="document" reason={result.result.records.length ? 'unsupported' : 'empty'} art={documentCollectionEmptyCompact} title={result.result.records.length ? 'No document data in this result' : 'No documents returned'} description={result.result.records.length ? 'The returned records do not contain document bodies. Inspect the collection as a table or return document fields.' : 'This query returned no documents. Adjust the query or inspect the collection as a table.'}>
      {#snippet actions()}{#if collection}<Button href={collectionPageHref(collection, 'table')}>View as table</Button>{/if}{/snippet}
    </RendererEmptyState>
  {:else}
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors', mode === 'body' ? 'bg-primary text-on-primary' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'body')}
          aria-pressed={mode === 'body'}
        >
          <Braces class="size-3" />
          body
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'fields' ? 'bg-primary text-on-primary' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'fields')}
          aria-pressed={mode === 'fields'}
        >
          <FileText class="size-3" />
          fields
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'raw' ? 'bg-primary text-on-primary' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'raw')}
          aria-pressed={mode === 'raw'}
        >
          <Braces class="size-3" />
          raw
        </button>
      </div>

      <div class="inline-flex items-center gap-1.5 border border-line-1 rounded px-2 py-1 bg-bg-0">
        <Search class="size-3 text-fg-3" />
        <input data-document-filter aria-label="Filter documents" type="text" bind:value={filter} placeholder="document search…" class="bg-transparent text-fg-1 outline-none w-[200px] placeholder:text-fg-3" />
        {#if filter}
          <button type="button" onclick={clearFilter} class="text-fg-3 hover:text-fg-1 cursor-pointer" aria-label="Clear document filter">
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
              <span class="text-primary-text truncate">{doc.title}</span>
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
          <RendererEmptyState surface="document" reason="filtered" art={searchEmpty} title="No documents match this filter" description="Clear the search to show the returned documents.">
            {#snippet actions()}<Button onclick={clearFilter}>Clear document filter</Button>{/snippet}
          </RendererEmptyState>
        {/if}
      </div>
    </div>

    <div class="border-t border-line-1 px-3 py-1.5 text-[10px] font-mono text-fg-3">
      {docs.length} documents{collection ? ' · ' : ''}{collection ?? ''}
    </div>
  {/if}
</div>
