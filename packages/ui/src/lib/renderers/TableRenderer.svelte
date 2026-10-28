<script lang="ts">
  import { useWorkspace } from '../workspace-context'
  import { tick } from 'svelte'
  import { Button } from '@reddb-io/design-system/base'
  import Table, { type TableChange, type TableColumn, type TableRow } from '@reddb-io/design-system/data/Table'
  import { isSafeCellUpdateTarget } from '@reddb-io/design-system/adapters/reddb/change-sql'
  import { tableEmptyCompact, searchEmpty } from '@reddb-io/design-system/base/illustrations'
  import RendererEmptyState from './RendererEmptyState.svelte'
  import type { QueryResult } from '#reddb'

  import Columns3 from '@lucide/svelte/icons/columns-3'
  import Filter from '@lucide/svelte/icons/filter'
  import Loader2 from '@lucide/svelte/icons/loader-2'
  import Play from '@lucide/svelte/icons/play'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import X from '@lucide/svelte/icons/x'
  import {
    formatCell,
    identityKind,
    inferPkColumn,
    isNull,
    isSystemField,
    rowId,
    visibleColumns,
    visibleRows,
  } from './table-render'

  const workspace = useWorkspace()
  const { activity, connection, pendingChanges } = workspace

  interface Props {
    result: QueryResult
    collection?: string
    showSystem?: boolean
  }

  let { result, collection, showSystem = false }: Props = $props()

  let overrideResult = $state<QueryResult | null>(null)
  const activeResult = $derived(overrideResult ?? result)
  const allRows = $derived(visibleRows(activeResult).map((row) => ({ ...row })))
  const columns = $derived(visibleColumns(activeResult, { showSystem }))
  const pkCol = $derived(inferPkColumn(columns))
  const queryableColumns = $derived(columns.filter((c) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(c)))

  let selectOpen = $state(false)
  let selectedColumns = $state<Record<string, boolean>>({})
  let selectLimit = $state(200)
  let selecting = $state(false)
  let selectError = $state<string | null>(null)

  $effect(() => {
    const next = { ...selectedColumns }
    let changed = false
    for (const col of queryableColumns) {
      if (next[col] === undefined) {
        next[col] = true
        changed = true
      }
    }
    for (const col of Object.keys(next)) {
      if (!queryableColumns.includes(col)) {
        delete next[col]
        changed = true
      }
    }
    if (changed) selectedColumns = next
  })

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

  let root: HTMLDivElement
  async function clearAllFilters() {
    filters = {}
    await tick()
    root.querySelector<HTMLButtonElement>('[data-table-filter-toggle]')?.focus()
  }

  function safeCollectionName(): string | null {
    if (!collection) return null
    const safe = collection.replace(/[^A-Za-z0-9_./-]/g, '')
    return safe.length > 0 ? safe : null
  }

  function selectedProjection(): string {
    const cols = queryableColumns.filter((c) => selectedColumns[c])
    return cols.length === 0 || cols.length === queryableColumns.length ? '*' : cols.join(', ')
  }

  function selectSql(): string | null {
    const safe = safeCollectionName()
    if (!safe) return null
    return `SELECT ${selectedProjection()} FROM ${safe} LIMIT ${selectLimit}`
  }

  async function runSelect() {
    const client = connection.client
    const sql = selectSql()
    if (!client || !sql) return
    selecting = true
    selectError = null
    try {
      const r = await activity.track(`${collection} · ${sql}`, () => client.query(sql))
      if (!r.ok) {
        selectError = r.error ?? 'query failed'
        return
      }
      overrideResult = r
      filters = {}
    } catch (e) {
      selectError = (e as Error).message
    } finally {
      selecting = false
      await tick()
      root.querySelector<HTMLButtonElement>('[data-table-run-select]')?.focus()
    }
  }

  function resetSelect() {
    overrideResult = null
    filters = {}
    selectError = null
  }

  const numberColumnKey = $derived.by(() => {
    let key = '__red_ui_row_number__'
    while (columns.includes(key) || allRows.some((row) => key in row)) key += '_'
    return key
  })
  const tableColumns = $derived<TableColumn[]>([
    { key: numberColumnKey, header: '#', align: 'end' },
    ...columns.map((key) => ({
      key, header: `${key}${isSystemField(key) ? ' · sys' : identityKind(key) === 'id' || key === pkCol ? ' · pk' : ''}`,
      editable: !isSystemField(key), format: formatCell,
      // Keep the existing string-oriented RedDB editing contract.
      parse: (input: string) => input,
    })),
  ])
  // Distinct display rows may address the same database row (e.g. a join).
  // Use source positions for the grid keys, but retain rid for mutations.
  function keyForRow(row: TableRow): string {
    return `row-${allRows.indexOf(row)}`
  }
  const tableChanges = $derived<TableChange[]>(allRows.flatMap((row) => {
    const rid = rowId(row)
    return pendingChanges.changes
      .filter((change) => change.table === collection && change.row === rid)
      .map((change) => ({ rowKey: keyForRow(row), columnKey: change.col, previous: change.oldValue, value: change.newValue }))
  }))

  function editable(row: TableRow, column: TableColumn): boolean {
    const rid = rowId(row)
    return !!collection && !connection.readOnly && rid !== null &&
      isSafeCellUpdateTarget({ table: collection, col: column.key, row: rid })
  }

  function updateChanges(next: readonly TableChange[]) {
    if (!collection) return
    // Process only the changed grid entry, not all staged cells. Entries for
    // rows absent from this result remain in the workspace queue untouched.
    const before = tableChanges
    for (const change of before) {
      if (next.some((item) => item.rowKey === change.rowKey && item.columnKey === change.columnKey)) continue
      const index = Number(String(change.rowKey).slice(4))
      const rid = rowId(allRows[index] ?? {})
      const staged = rid === null ? undefined : pendingChanges.find(collection, rid, change.columnKey)
      if (staged) pendingChanges.unstage(staged.id)
    }
    for (const change of next) {
      const old = before.find((item) => item.rowKey === change.rowKey && item.columnKey === change.columnKey)
      if (old && Object.is(old.value, change.value)) continue
      const index = Number(String(change.rowKey).slice(4))
      const rid = rowId(allRows[index] ?? {})
      if (rid === null) continue
      const existing = pendingChanges.find(collection, rid, change.columnKey)
      const value = String(change.value ?? '')
      if (String(change.previous ?? '') === value) {
        if (existing) pendingChanges.unstage(existing.id)
      } else {
        pendingChanges.stage(collection, rid, change.columnKey, change.previous, value)
      }
    }
  }

</script>

<div bind:this={root} data-renderer="table" class="flex h-full flex-col text-fg-1">
  {#if !activeResult.ok}
    <div role="alert" class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      {activeResult.error ?? 'Query failed.'}
    </div>
  {:else}
    <!-- Toolbar: SELECT + per-column filters -->
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      {#if collection}
        <button
          type="button"
          onclick={() => (selectOpen = !selectOpen)}
          aria-pressed={selectOpen}
          title="Build a SELECT for this collection"
          class={[
            'inline-flex items-center gap-1.5 h-6 px-2 rounded border transition-colors cursor-pointer',
            selectOpen
              ? 'border-accent/40 bg-accent/10 text-primary-text'
              : 'border-line-1 text-fg-1 hover:border-line-2',
          ].join(' ')}
        >
          <Columns3 class="size-3" />
          <span>select</span>
        </button>
        <button
          type="button"
          data-table-run-select
          onclick={runSelect}
          disabled={selecting || !connection.connected}
          class="inline-flex items-center gap-1 h-6 px-2 rounded border border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Run the current SELECT against reddb"
        >
          {#if selecting}<Loader2 class="size-3 animate-spin" />{:else}<Play class="size-3" />{/if}
          run
        </button>
        {#if overrideResult}
          <button
            type="button"
            onclick={resetSelect}
            class="inline-flex items-center gap-1 h-6 px-2 rounded border border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2 cursor-pointer"
            title="Return to the original result"
          >
            <RotateCw class="size-3" />
            reset
          </button>
        {/if}
        <div class="h-4 w-px bg-line-1"></div>
      {/if}
      <button
        type="button"
        data-table-filter-toggle
        onclick={() => (filtersOpen = !filtersOpen)}
        aria-pressed={filtersOpen}
        title={filtersOpen ? 'Hide column filters' : 'Show column filters'}
        class={[
          'inline-flex items-center gap-1.5 h-6 px-2 rounded border transition-colors cursor-pointer',
          filtersOpen
            ? 'border-accent/40 bg-accent/10 text-primary-text'
            : 'border-line-1 text-fg-1 hover:border-line-2',
        ].join(' ')}
      >
        <Filter class="size-3" />
        <span>filters</span>
        {#if activeFilterCount > 0}
          <span class="text-[9px] px-1 rounded bg-primary text-on-primary">{activeFilterCount}</span>
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

    {#if selectOpen && collection}
      <div class="border-b border-line-1 bg-bg-1/20 px-3 py-2 text-[11px] font-mono">
        <div class="mb-2 flex items-center gap-2">
          <span class="text-fg-3">columns:</span>
          <button
            type="button"
            class="rounded border border-line-1 px-1.5 py-0.5 text-fg-3 hover:text-fg-1 hover:border-line-2"
            onclick={() => {
              const next: Record<string, boolean> = {}
              for (const col of queryableColumns) next[col] = true
              selectedColumns = next
            }}
          >
            all
          </button>
          <button
            type="button"
            class="rounded border border-line-1 px-1.5 py-0.5 text-fg-3 hover:text-fg-1 hover:border-line-2"
            onclick={() => (selectedColumns = {})}
          >
            none
          </button>
          <label class="ml-auto inline-flex items-center gap-1.5 text-fg-3">
            limit
            <select
              class="bg-bg-1 text-fg-1 border border-line-1 rounded px-1 py-0.5"
              value={selectLimit}
              onchange={(e) => (selectLimit = Number((e.currentTarget as HTMLSelectElement).value))}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1k</option>
            </select>
          </label>
        </div>
        <div class="flex flex-wrap gap-1">
          {#each queryableColumns as col (col)}
            <label
              class={[
                'inline-flex h-5 items-center gap-1 rounded border px-1.5 cursor-pointer',
                selectedColumns[col] ? 'border-accent/40 bg-accent/10 text-primary-text' : 'border-line-1 text-fg-3 hover:text-fg-1',
              ].join(' ')}
            >
              <input
                type="checkbox"
                class="sr-only"
                checked={selectedColumns[col] ?? false}
                onchange={(e) => (selectedColumns = { ...selectedColumns, [col]: (e.currentTarget as HTMLInputElement).checked })}
              />
              {col}
            </label>
          {/each}
        </div>
        <div class="mt-2 flex items-center gap-2 text-fg-3">
          <code class="min-w-0 flex-1 truncate rounded border border-line-1 bg-bg-0 px-2 py-1 text-fg-1">{selectSql() ?? 'No collection selected'}</code>
          {#if selectError}<span class="text-warn">{selectError}</span>{/if}
        </div>
      </div>
    {/if}

    {#if !activeResult.result.records.length}
      <RendererEmptyState surface="table" art={tableEmptyCompact} title="No rows returned" description={collection ? `This query returned no rows from ${collection}. Adjust the query or run SELECT again.` : 'This query returned no rows. Adjust the query and run it again.'}>
        {#snippet actions()}{#if collection && connection.connected}<Button onclick={runSelect} disabled={selecting}>Run SELECT again</Button>{/if}{/snippet}
      </RendererEmptyState>
    {:else}

    {#if filtersOpen}
      <div class="flex flex-wrap gap-2 border-b border-line-1 bg-bg-0 px-3 py-2" data-table-filters>
        {#each columns as c}
          <label class="grid gap-1 text-[11px] text-fg-3">
            <span>{c}</span>
            <span class="relative">
              <input type="text" bind:value={filters[c]} aria-label="Filter {c}" placeholder="filter {c}…"
                class="h-6 w-32 rounded border border-line-1 bg-bg-1 pl-2 pr-5 text-fg-1 focus:border-accent" />
              {#if filters[c]?.length}
                <button type="button" onclick={() => clearFilter(c)} aria-label="Clear filter for {c}"
                  class="absolute right-1 top-1/2 -translate-y-1/2 text-fg-3"><X class="size-3" /></button>
              {/if}
            </span>
          </label>
        {/each}
      </div>
    {/if}
    <div class="flex-1 overflow-auto">
      <Table caption={collection ? `${collection} results` : 'Query results'} captionHidden
        columns={tableColumns} {rows} rowKey={keyForRow}
        {editable} changes={tableChanges} onchangeschange={updateChanges} pageSize={80} columnVisibility={false}>
        {#snippet cell({ column, row, value, text })}
          {#if column.key === numberColumnKey}<span class="text-fg-3">{rows.indexOf(row) + 1}</span>{:else if isNull(value)}<span class="italic text-fg-3">NULL</span>{:else}<span class="block max-w-[260px] truncate">{text}</span>{/if}
        {/snippet}
        {#snippet empty()}
          <RendererEmptyState surface="table" reason="filtered" art={searchEmpty} title="No rows match these filters" description="Clear the column filters to show the returned rows.">
            {#snippet actions()}<Button onclick={clearAllFilters}>Clear filters</Button>{/snippet}
          </RendererEmptyState>
        {/snippet}
      </Table>
    </div>
    <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3 flex items-center gap-3">
      <span>
        {rows.length} of {activeResult.record_count} rows
        {#if activeFilterCount > 0}· filtered{/if}
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </span>
      <span>· double-click or press Enter to stage an edit</span>
      {#if pkCol}<span>· pk <code class="text-fg-2">{pkCol}</code></span>{/if}
    </div>
    {/if}
  {/if}
</div>
