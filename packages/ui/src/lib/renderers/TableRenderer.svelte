<script lang="ts">
  import type { QueryResult } from '#reddb'
  import { connection } from '$lib/connections.svelte'
  import { activity } from '$lib/activity.svelte'
  import { pendingChanges } from '$lib/pending-changes.svelte'
  import { Columns3, Filter, Loader2, Play, RotateCw, X } from 'lucide-svelte'
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

  let overrideResult = $state<QueryResult | null>(null)
  const activeResult = $derived(overrideResult ?? result)
  const allRows = $derived(visibleRows(activeResult))
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

  function clearAllFilters() {
    filters = {}
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
      editing = null
    } catch (e) {
      selectError = (e as Error).message
    } finally {
      selecting = false
    }
  }

  function resetSelect() {
    overrideResult = null
    filters = {}
    selectError = null
  }

  let editing = $state<{ row: number; col: string } | null>(null)
  let editValue = $state('')

  function startEdit(row: number, col: string, value: unknown) {
    // Read-only server (#23): cells aren't editable — the mutation entry point
    // is absent rather than letting a doomed edit stage and fail at commit.
    if (editing || !collection || connection.readOnly) return
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
  {#if !activeResult.ok}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
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
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2',
          ].join(' ')}
        >
          <Columns3 class="size-3" />
          <span>select</span>
        </button>
        <button
          type="button"
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
                selectedColumns[col] ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line-1 text-fg-3 hover:text-fg-1',
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
      <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
        Empty result.
      </div>
    {:else}

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
        {rows.length} of {activeResult.record_count} rows
        {#if activeFilterCount > 0}· filtered{/if}
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </span>
      <span>· double-click a cell to stage edit</span>
      {#if pkCol}<span>· pk <code class="text-fg-2">{pkCol}</code></span>{/if}
    </div>
    {/if}
  {/if}
</div>
