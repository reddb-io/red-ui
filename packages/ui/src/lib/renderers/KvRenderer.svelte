<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { buildTree, extractKv, formatValue, type KvNode } from './kv-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  const entries = $derived(extractKv(result))
  const tree = $derived(buildTree(entries))
  let selected = $state<KvNode | null>(null)

  function preview(v: unknown): string {
    const s = formatValue(v)
    return s.length > 60 ? s.slice(0, 59) + '…' : s
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if entries.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No KV shape — expected <code>key</code> and <code>value</code> columns.
    </div>
  {:else}
    <div class="flex-1 grid grid-cols-[280px_1fr] min-h-0">
      <ul class="overflow-auto border-r border-line-1 text-[12px] font-mono py-1">
        {#each tree.children as node (node.name)}
          {@render renderNode(node, 0)}
        {/each}
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
    <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3 flex items-center gap-3">
      <span>{entries.length} keys{collection ? ' · ' : ''}{collection ?? ''}</span>
    </div>
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
