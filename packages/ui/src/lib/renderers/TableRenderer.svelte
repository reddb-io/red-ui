<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import {
    formatCell,
    inferPkColumn,
    isNull,
    visibleColumns,
    visibleRows,
  } from './table-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  // Local optimistic mutation surface — cell edits apply here. Resets when
  // the underlying result identity changes.
  let localRows = $state<Array<Record<string, unknown>>>([])
  let lastSeen = $state<QueryResult | null>(null)

  const columns = $derived(visibleColumns(result))
  const pkCol = $derived(inferPkColumn(columns))

  $effect(() => {
    if (result !== lastSeen) {
      localRows = visibleRows(result)
      lastSeen = result
    }
  })

  let editing = $state<{ row: number; col: string } | null>(null)
  let editValue = $state('')

  function startEdit(row: number, col: string, value: unknown) {
    if (editing) return
    editing = { row, col }
    editValue = String(value ?? '')
  }

  function commit() {
    if (!editing) return
    const { row, col } = editing
    const target = localRows[row]
    if (target) target[col] = editValue
    editing = null
  }

  function cancel() {
    editing = null
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus()
    node.select()
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if !result.ok || !result.result.records.length}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      {result.ok ? 'Empty result.' : (result.error ?? 'Query failed.')}
    </div>
  {:else}
    <div class="flex-1 overflow-auto">
      <table class="w-full border-collapse text-[12px] font-mono">
        <thead class="sticky top-0 bg-bg-1 z-10">
          <tr class="border-b border-line-1 text-fg-3">
            <th class="px-2 py-1.5 text-right w-10 font-normal">#</th>
            {#each columns as c}
              <th class="px-2 py-1.5 text-left font-normal whitespace-nowrap">
                <span>{c}</span>
                {#if c === pkCol}
                  <span class="ml-1 text-[10px] text-accent uppercase tracking-wide" title="Inferred primary key">pk</span>
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each localRows as row, i (i)}
            <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
              <td class="px-2 py-1 text-right text-fg-3 select-none">{i + 1}</td>
              {#each columns as c}
                {@const v = row[c]}
                {@const isEditing = editing?.row === i && editing.col === c}
                <td
                  class="px-2 py-1 max-w-[260px] truncate align-top"
                  ondblclick={() => startEdit(i, c, v)}
                >
                  {#if isEditing}
                    <input
                      class="w-full bg-bg-2 text-fg-1 border border-accent/60 rounded px-1 py-0.5 outline-none"
                      bind:value={editValue}
                      onblur={commit}
                      use:focusOnMount
                      onkeydown={(e) => {
                        if (e.key === 'Enter') commit()
                        else if (e.key === 'Escape') cancel()
                      }}
                    />
                  {:else if isNull(v)}
                    <span class="text-fg-3 italic">NULL</span>
                  {:else}
                    <span class="block truncate">{formatCell(v)}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3 flex items-center gap-3">
      <span>
        {localRows.length} of {result.record_count} rows
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </span>
      <span>· double-click a cell to edit</span>
      {#if pkCol}<span>· pk <code class="text-fg-2">{pkCol}</code></span>{/if}
    </div>
  {/if}
</div>
