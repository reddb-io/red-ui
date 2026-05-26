<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { pendingChanges } from '$lib/pending-changes.svelte'
  import { Filter, X } from 'lucide-svelte'
  import {
    formatCell,
    identityKind,
    inferPkColumn,
    isNull,
    isSystemField,
    visibleColumns,
    visibleRows,
  } from './table-render'

  interface Props {
    result: QueryResult
    collection?: string
    showSystem?: boolean
  }

  let { result, collection, showSystem = false }: Props = $props()

  const allRows = $derived(visibleRows(result))
  const columns = $derived(visibleColumns(result, { showSystem }))
  const pkCol = $derived(inferPkColumn(columns))

  // ─── filters ────────────────────────────────────────────────────────────
  // Per-column substring filter, case-insensitive. The toolbar shows a
  // single-input "filter X" affordance with column picker; the header
  // also lets the user click a column name to focus the filter on it.
  let filters = $state<Record<string, string>>({})
  let filtersOpen = $state(false)

  const filteredRows = $derived.by(() => {
    const active = Object.entries(filters).filter(([, v]) => v.trim().length > 0)
    if (active.length === 0) return allRows
    return allRows.filter((row) =>
      active.every(([col, term]) => {
        const v = row[col]
        if (v === null || v === undefined) return false
        return String(v).toLowerCase().includes(term.toLowerCase())
      }),
    )
  })

  const rows = $derived(filteredRows)
  const activeFilterCount = $derived(Object.values(filters).filter((v) => v.trim().length > 0).length)

  function clearFilter(col: string) {
    const next = { ...filters }
    delete next[col]
    filters = next
  }

  function clearAllFilters() {
    filters = {}
  }

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
    <!-- Toolbar: per-column filters -->
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <button
        type="button"
        onclick={() => (filtersOpen = !filtersOpen)}
        aria-pressed={filtersOpen}
        title={filtersOpen ? 'Hide column filters' : 'Show column filters'}
        class={[
          'inline-flex items-center gap-1.5 h-6 px-2 rounded border transition-colors cursor-pointer',
          filtersOpen
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2',
        ].join(' ')}
      >
        <Filter class="size-3" />
        <span>filters</span>
        {#if activeFilterCount > 0}
          <span class="text-[9px] px-1 rounded bg-accent text-white">{activeFilterCount}</span>
        {/if}
      </button>
      {#if activeFilterCount > 0}
        <button
          type="button"
          onclick={clearAllFilters}
          class="inline-flex items-center gap-1 h-6 px-2 rounded border border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2 cursor-pointer"
          title="Clear all filters"
        >
          <X class="size-3" />
          clear
        </button>
      {/if}
      <div class="ml-auto text-fg-3">
        {rows.length.toLocaleString()}{#if activeFilterCount > 0} of {allRows.length.toLocaleString()}{/if} rows
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full border-collapse text-[12px] font-mono">
        <thead class="sticky top-0 bg-bg-1 z-10">
          <tr class="border-b border-line-1 text-fg-3">
            <th class="px-2 py-1.5 text-right w-10 font-normal">#</th>
            {#each columns as c}
              {@const kind = identityKind(c)}
              {@const sys = isSystemField(c)}
              <th
                class={[
                  'px-2 py-1.5 text-left font-normal whitespace-nowrap',
                  kind === 'rid' ? 'bg-accent/5 text-fg-0' : sys ? 'bg-bg-1 text-fg-2' : kind === 'id' ? 'text-fg-1' : '',
                ].join(' ')}
              >
                <span class={kind || sys ? 'font-semibold' : ''}>{c}</span>
                {#if kind === 'rid'}
                  <span class="ml-1 text-[9px] px-1 py-0.5 rounded bg-accent text-white uppercase tracking-wider font-semibold" title="System-assigned row id — reddb's canonical address">sys</span>
                {:else if sys}
                  <span class="ml-1 text-[9px] px-1 py-0.5 rounded border border-line-2 text-fg-3 uppercase tracking-wider" title="Reserved system field — written by reddb">sys</span>
                {:else if kind === 'id'}
                  <span class="ml-1 text-[9px] px-1 py-0.5 rounded border border-line-2 text-fg-2 uppercase tracking-wider" title="User-defined identifier">pk</span>
                {:else if c === pkCol}
                  <span class="ml-1 text-[10px] text-fg-3 uppercase tracking-wide" title="Inferred primary key">pk</span>
                {/if}
              </th>
            {/each}
          </tr>
          {#if filtersOpen}
            <tr class="border-b border-line-1 bg-bg-0">
              <th class="px-2 py-1"></th>
              {#each columns as c}
                <th class="px-1 py-1">
                  <div class="relative">
                    <input
                      type="text"
                      bind:value={filters[c]}
                      placeholder="filter {c}…"
                      class="w-full h-6 pl-2 pr-5 bg-bg-1 text-fg-1 border border-line-1 rounded text-[11px] font-mono outline-none focus:border-accent placeholder:text-fg-3"
                    />
                    {#if filters[c]?.length}
                      <button
                        type="button"
                        onclick={() => clearFilter(c)}
                        aria-label="Clear filter for {c}"
                        class="absolute right-1 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-1 cursor-pointer"
                      >
                        <X class="size-3" />
                      </button>
                    {/if}
                  </div>
                </th>
              {/each}
            </tr>
          {/if}
        </thead>
        <tbody>
          {#each rows as row, i (i)}
            <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
              <td class="px-2 py-1 text-right text-fg-3 select-none">{i + 1}</td>
              {#each columns as c}
                {@const v = row[c]}
                {@const display = cellDisplay(i, c, v)}
                {@const isEditing = editing?.row === i && editing.col === c}
                {@const kind = identityKind(c)}
                {@const sys = isSystemField(c)}
                <td
                  class={[
                    'px-2 py-1 max-w-[260px] truncate align-top',
                    kind === 'rid'
                      ? 'bg-accent/5 text-accent font-semibold'
                      : sys
                        ? 'bg-bg-1 text-fg-2 font-mono'
                        : kind === 'id'
                          ? 'text-fg-0'
                          : '',
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
        {#if activeFilterCount > 0}· filtered{/if}
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </span>
      <span>· double-click a cell to stage edit</span>
      {#if pkCol}<span>· pk <code class="text-fg-2">{pkCol}</code></span>{/if}
    </div>
  {/if}
</div>
