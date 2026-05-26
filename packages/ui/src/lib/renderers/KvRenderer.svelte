<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { Braces, ListTree, Search, X } from 'lucide-svelte'
  import { buildTree, extractKv, flattenUnderPrefix, formatValue, type KvNode } from './kv-render'

  interface Props {
    result: QueryResult
    collection?: string
    showSystem?: boolean
  }

  let { result, collection }: Props = $props()

  // ─── state ──────────────────────────────────────────────────────────────
  let prefix = $state('')
  let viewMode = $state<'tree' | 'json'>('tree')
  let selected = $state<KvNode | null>(null)

  // ─── data ───────────────────────────────────────────────────────────────
  const entries = $derived(extractKv(result))
  const filteredEntries = $derived(
    prefix.trim() ? entries.filter((e) => e.key.startsWith(prefix.trim())) : entries,
  )
  const tree = $derived(buildTree(filteredEntries))
  const jsonObject = $derived(flattenUnderPrefix(entries, prefix.trim()))

  function preview(v: unknown): string {
    const s = formatValue(v)
    return s.length > 60 ? s.slice(0, 59) + '…' : s
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if entries.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No KV shape — expected <code>key</code> and <code>value</code> columns
      (also accepts <code>*_key</code>/<code>*_value</code>).
    </div>
  {:else}
    <!-- Toolbar -->
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={[
            'inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors',
            viewMode === 'tree' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => (viewMode = 'tree')}
          aria-pressed={viewMode === 'tree'}
        >
          <ListTree class="size-3" />
          Tree
        </button>
        <button
          type="button"
          class={[
            'inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2',
            viewMode === 'json' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => (viewMode = 'json')}
          aria-pressed={viewMode === 'json'}
        >
          <Braces class="size-3" />
          JSON
        </button>
      </div>

      <div class="inline-flex items-center gap-1.5 border border-line-1 rounded px-2 py-1 bg-bg-0">
        <Search class="size-3 text-fg-3" />
        <input
          type="text"
          bind:value={prefix}
          placeholder="key prefix…"
          class="bg-transparent text-fg-1 outline-none w-[220px] placeholder:text-fg-3"
        />
        {#if prefix}
          <button
            type="button"
            onclick={() => (prefix = '')}
            class="text-fg-3 hover:text-fg-1 cursor-pointer"
            aria-label="Clear prefix"
          >
            <X class="size-3" />
          </button>
        {/if}
      </div>

      <div class="ml-auto text-fg-3">
        {filteredEntries.length.toLocaleString()}{#if prefix} of {entries.length.toLocaleString()}{/if} keys
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </div>
    </div>

    <!-- Body -->
    {#if viewMode === 'tree'}
      <div class="flex-1 grid grid-cols-[280px_1fr] min-h-0">
        <ul class="overflow-auto border-r border-line-1 text-[12px] font-mono py-1">
          {#if tree.children.length === 0}
            <li class="px-3 py-2 text-fg-3">No keys match prefix.</li>
          {:else}
            {#each tree.children as node (node.name)}
              {@render renderNode(node, 0)}
            {/each}
          {/if}
        </ul>
        <div class="overflow-auto p-3 text-[12px] font-mono">
          {#if selected}
            <div class="text-fg-3 mb-2">{selected.fullKey ?? selected.name}</div>
            <pre class="text-fg-1 whitespace-pre-wrap break-all">{formatValue(selected.value)}</pre>
          {:else}
            <div class="text-fg-3">Click a key to inspect.</div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="flex-1 overflow-auto p-3 text-[12px] font-mono">
        {#if Object.keys(jsonObject).length === 0}
          <div class="text-fg-3">No keys match prefix.</div>
        {:else}
          <pre class="whitespace-pre text-fg-1">{JSON.stringify(jsonObject, null, 2)}</pre>
        {/if}
      </div>
    {/if}
  {/if}
</div>

{#snippet renderNode(node: KvNode, depth: number)}
  <li>
    <button
      type="button"
      class="w-full text-left px-2 py-0.5 hover:bg-bg-1/60"
      class:text-accent={selected === node}
      style:padding-left={`${8 + depth * 12}px`}
      onclick={() => (selected = node)}
    >
      <span class="text-fg-1">{node.name}</span>
      {#if node.fullKey !== null}
        <span class="text-fg-3 ml-2">{preview(node.value)}</span>
      {/if}
    </button>
    {#if node.children.length > 0}
      <ul>
        {#each node.children as child (child.name)}
          {@render renderNode(child, depth + 1)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}
