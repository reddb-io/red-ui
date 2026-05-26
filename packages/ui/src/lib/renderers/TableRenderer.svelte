<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { pendingChanges } from '$lib/pending-changes.svelte'
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

  const rows = $derived(visibleRows(result))
  const columns = $derived(visibleColumns(result))
  const pkCol = $derived(inferPkColumn(columns))

  let editing = $state<{ row: number; col: string } | null>(null)
  let editValue = $state('')

  function startEdit(row: number, col: string, value: unknown) {
    if (editing || !collection) return
    editing = { row, col }
    const staged = pendingChanges.find(collection, row, col)
    editValue = staged ? staged.newValue : String(value ?? '')
  }

  function commit() {
    if (!editing || !collection) return
    const { row, col } = editing
    const original = rows[row]?.[col]
    const next = editValue
    if (String(original ?? '') !== next) {
      pendingChanges.stage(collection, row, col, original, next)
    } else {
      // Reverting to original value — drop any prior staged change for it.
      const existing = pendingChanges.find(collection, row, col)
      if (existing) pendingChanges.unstage(existing.id)
    }
    editing = null
  }

  function cancel() {
    editing = null
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus()
    node.select()
  }

  function cellDisplay(row: number, col: string, v: unknown): { value: unknown; staged: boolean } {
    if (!collection) return { value: v, staged: false }
    const staged = pendingChanges.find(collection, row, col)
    if (staged) return { value: staged.newValue, staged: true }
    return { value: v, staged: false }
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
          {#each rows as row, i (i)}
            <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
              <td class="px-2 py-1 text-right text-fg-3 select-none">{i + 1}</td>
              {#each columns as c}
                {@const v = row[c]}
                {@const display = cellDisplay(i, c, v)}
                {@const isEditing = editing?.row === i && editing.col === c}
                <td
                  class={[
                    'px-2 py-1 max-w-[260px] truncate align-top',
                    display.staged && !isEditing ? 'bg-warn/15 text-fg-1' : '',
                  ].join(' ')}
                  ondblclick={() => startEdit(i, c, v)}
                  title={display.staged ? 'Staged change — open Pending Changes to commit' : undefined}
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
                  {:else if isNull(display.value)}
                    <span class="text-fg-3 italic">NULL</span>
                  {:else}
                    <span class="block truncate">{formatCell(display.value)}</span>
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
        {rows.length} of {result.record_count} rows
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </span>
      <span>· double-click a cell to stage edit</span>
      {#if pkCol}<span>· pk <code class="text-fg-2">{pkCol}</code></span>{/if}
    </div>
  {/if}
</div>
