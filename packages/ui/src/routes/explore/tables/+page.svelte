<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { auth, audit } from '$lib/auth.svelte'
  import { connection } from '$lib/connections.svelte'
  import { Table2, Database, AlertTriangle, X } from 'lucide-svelte'
  import { onMount } from 'svelte'

  let selected = $state<string>('')
  let filter = $state('')
  let editing = $state<{ row: number; col: string } | null>(null)
  let editValue = $state('')

  let collections = $state<string[]>([])
  let rows = $state<Array<Record<string, unknown>>>([])
  let columns = $state<string[]>([])
  let error = $state<string | null>(null)
  let loading = $state(false)

  // Pending edit awaiting confirmation (when target is primary).
  // When set, the diff modal is shown.
  let pendingEdit = $state<{ row: number; col: string; oldValue: unknown; newValue: string } | null>(null)

  // Cell flash for just-committed edits.
  let flashed = $state<{ row: number; col: string } | null>(null)

  // Undo state — the last commit's previous value.
  let lastEdit = $state<{
    table: string
    row: number
    col: string
    oldValue: unknown
    newValue: string
    at: number
  } | null>(null)
  let toastVisible = $state(false)
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    if (!connection.probe.reachable) {
      collections = []
      return
    }
    const client = connection.client!
    client.collections().then((cs) => {
      collections = cs.filter((c) => !c.startsWith('red.') && !c.startsWith('red_'))
      if (collections.length && !collections.includes(selected)) selected = collections[0]
      if (!collections.length) selected = ''
    }).catch((e) => { error = e.message })
  })

  $effect(() => {
    if (!connection.probe.reachable || !selected) return
    const client = connection.client!
    const coll = selected
    loading = true
    error = null
    client.query(`SELECT * FROM ${coll} LIMIT 200`).then((r) => {
      rows = r.result.records.map((rec) => rec.values)
      columns = r.result.columns.filter((c) => !c.startsWith('red_') && c !== 'body' && c !== 'created_at' && c !== 'updated_at')
      if (columns.length === 0) columns = r.result.columns
      loading = false
    }).catch((e) => { error = e.message; loading = false })
  })

  const filteredRows = $derived(
    filter.trim() === '' ? rows : rows.filter((r) => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase())),
  )

  // Best-effort primary key detection from column names. reddb doesn't
  // surface schema cheaply, so we infer.
  const pkCol = $derived(
    columns.find((c) => c.toLowerCase() === 'id')
      ?? columns.find((c) => c.toLowerCase() === 'rid')
      ?? columns.find((c) => c.toLowerCase().endsWith('_id'))
      ?? columns[0]
      ?? null,
  )

  const isPrimary = $derived(connection.probe.replication?.role === 'primary')

  function startEdit(row: number, col: string, value: unknown) {
    if (!auth.can('write', 'table')) return
    if (pendingEdit) return // don't start a new edit while a diff modal is open
    editing = { row, col }
    editValue = String(value ?? '')
  }

  function attemptCommit() {
    if (!editing) return
    const { row, col } = editing
    const oldValue = filteredRows[row]?.[col]
    const newValue = editValue

    // No-op: same value → just close without ceremony
    if (String(oldValue ?? '') === newValue) {
      editing = null
      return
    }

    // Primary writes require diff confirmation. Other roles commit directly.
    if (isPrimary) {
      pendingEdit = { row, col, oldValue, newValue }
    } else {
      doCommit(row, col, oldValue, newValue)
    }
    editing = null
  }

  function doCommit(row: number, col: string, oldValue: unknown, newValue: string) {
    // Mutate the local row optimistically. The real impl would PATCH /collections/X/documents/ID.
    if (filteredRows[row]) {
      filteredRows[row][col] = newValue
    }
    audit.log('write', 'table', `${selected}[${row}].${col}`, `${String(oldValue ?? 'NULL')} → ${newValue}`)
    lastEdit = { table: selected, row, col, oldValue, newValue, at: Date.now() }
    showToast()
    flash(row, col)
  }

  function confirmPending() {
    if (!pendingEdit) return
    const { row, col, oldValue, newValue } = pendingEdit
    pendingEdit = null
    doCommit(row, col, oldValue, newValue)
  }

  function cancelPending() {
    pendingEdit = null
  }

  function undo() {
    if (!lastEdit) return
    const { table, row, col, oldValue, newValue } = lastEdit
    if (table === selected && filteredRows[row]) {
      filteredRows[row][col] = oldValue
    }
    audit.log('write', 'table', `${table}[${row}].${col}`, `undo: ${newValue} → ${String(oldValue ?? 'NULL')}`)
    lastEdit = null
    hideToast()
    flash(row, col)
  }

  function flash(row: number, col: string) {
    flashed = { row, col }
    setTimeout(() => {
      if (flashed?.row === row && flashed?.col === col) flashed = null
    }, 500)
  }

  function showToast() {
    toastVisible = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toastVisible = false }, 5000)
  }

  function hideToast() {
    toastVisible = false
    if (toastTimer) clearTimeout(toastTimer)
  }

  function fmtPreviewValue(v: unknown): string {
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
    return String(v)
  }

  const previewSql = $derived.by(() => {
    if (!pendingEdit) return ''
    const { row, col, newValue } = pendingEdit
    const pkValue = pkCol && filteredRows[row] ? filteredRows[row][pkCol] : null
    const where = pkCol && pkValue !== null && pkValue !== undefined
      ? `${pkCol} = ${fmtPreviewValue(pkValue)}`
      : `/* no primary key detected; would target row index ${row} */`
    return `UPDATE ${selected}\nSET ${col} = ${fmtPreviewValue(newValue)}\nWHERE ${where};`
  })

  function formatCell(v: unknown) {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  // Esc closes diff modal globally
  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && pendingEdit) {
        e.preventDefault()
        cancelPending()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

{#if !connection.probe.reachable}
  <PageHeader eyebrow="Explore" title="Tables" subtitle="Browse collections via SQL." />
  <EmptyState
    icon={Database}
    title="No connection"
    message="Open the connection switcher in the topbar to choose a reddb instance. Or start one with the script below."
    hint="./scripts/embedded.sh   ·   docker compose -f docker/compose.yml up -d"
  />
{:else if collections.length === 0}
  <PageHeader eyebrow="Explore" title="Tables" subtitle="No user collections yet." />
  <EmptyState
    icon={Table2}
    title="No collections in this instance"
    message="reddb is reachable but has no user-defined collections. Run the seed to create users, orders, tenants and 255 rows of demo data."
    hint="./scripts/seed.sh {connection.active.url}"
  />
{:else}
  <div class="layout">
    <aside class="sidebar">
      <div class="type-label px-2 py-2">Collections · {collections.length}</div>
      {#each collections as name}
        <button class="t-item" class:active={name === selected} onclick={() => (selected = name)}>
          <div class="t-name">{name}</div>
        </button>
      {/each}
    </aside>

    <section class="main">
      <PageHeader
        eyebrow="Table"
        title={selected || '—'}
        subtitle="Live · {connection.active.url} · {connection.probe.rtt_ms}ms"
      >
        <Badge tone="ok">live</Badge>
        <Badge tone="neutral">{filteredRows.length} of {rows.length} rows</Badge>
        {#if isPrimary}<Badge tone="accent">primary · writes confirm</Badge>{/if}

        {#snippet actions()}
          <input class="filter" bind:value={filter} placeholder="Filter…" />
          <Can action="write" resource="table">
            <Button size="sm" variant="primary">+ Insert row</Button>
          </Can>
          <Can action="delete" resource="table">
            <Button size="sm" variant="danger">Drop table</Button>
            {#snippet fallback()}<Badge tone="neutral">read-only</Badge>{/snippet}
          </Can>
        {/snippet}
      </PageHeader>

      {#if error}
        <div class="banner err"><strong>Query failed.</strong> {error}</div>
      {/if}
      {#if loading}
        <div class="banner">Loading {selected}…</div>
      {/if}

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="num">#</th>
              {#each columns as c}
                <th><span class="c-name">{c}</span>{#if c === pkCol}<span class="pk-mark" title="Inferred primary key">pk</span>{/if}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each filteredRows.slice(0, 80) as row, i}
              <tr>
                <td class="num">{i + 1}</td>
                {#each columns as c}
                  {@const isEditing = editing?.row === i && editing.col === c}
                  {@const isFlash = flashed?.row === i && flashed?.col === c}
                  <td
                    class:editable={auth.can('write', 'table')}
                    class:flash={isFlash}
                    ondblclick={() => startEdit(i, c, row[c])}
                  >
                    {#if isEditing}
                      <input
                        class="cell-edit"
                        bind:value={editValue}
                        onblur={attemptCommit}
                        onkeydown={(e) => { if (e.key === 'Enter') attemptCommit(); if (e.key === 'Escape') editing = null }}
                      />
                    {:else}
                      <span class="cell" class:null={row[c] === null || row[c] === undefined}>
                        {row[c] === null || row[c] === undefined ? 'NULL' : formatCell(row[c])}
                      </span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
        <div class="table-foot">
          {filteredRows.length} of {rows.length} fetched (LIMIT 200) · double-click a cell to edit · primary key inferred: <code class="pk-foot">{pkCol ?? 'none'}</code>
        </div>
      </div>
    </section>
  </div>
{/if}

<!-- Diff confirm modal — only on primary writes -->
{#if pendingEdit}
  <div class="scrim" onclick={cancelPending} role="presentation"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="diff-title">
    <header class="modal-h">
      <div class="modal-h-l">
        <AlertTriangle class="size-4 text-warn" />
        <h2 id="diff-title">Confirm write to primary</h2>
      </div>
      <button class="icon-btn" onclick={cancelPending} aria-label="Cancel"><X class="size-3.5" /></button>
    </header>

    <div class="modal-body">
      <p class="modal-lede">
        You're writing to <code>{connection.active.label}</code>. Review the SQL below, then confirm.
      </p>
      <pre class="diff">{previewSql}</pre>
      <div class="modal-meta">
        <div><span>before</span><code class="before">{fmtPreviewValue(pendingEdit.oldValue)}</code></div>
        <div><span>after</span><code class="after">{fmtPreviewValue(pendingEdit.newValue)}</code></div>
      </div>
    </div>

    <footer class="modal-f">
      <Button size="sm" onclick={cancelPending}>Cancel (Esc)</Button>
      <Button size="sm" variant="primary" onclick={confirmPending}>Apply</Button>
    </footer>
  </div>
{/if}

<!-- Undo toast — appears after every commit, 5s autodismiss -->
{#if toastVisible && lastEdit}
  <div class="toast" role="status" aria-live="polite">
    <span class="toast-icon"></span>
    <span class="toast-msg">
      <code>{lastEdit.table}[{lastEdit.row}].{lastEdit.col}</code>
      <span class="toast-arrow">→</span>
      <code class="toast-new">{lastEdit.newValue.length > 32 ? lastEdit.newValue.slice(0, 32) + '…' : lastEdit.newValue}</code>
    </span>
    <button class="toast-undo" onclick={undo}>Undo</button>
    <button class="toast-x" onclick={hideToast} aria-label="Dismiss"><X class="size-3" /></button>
  </div>
{/if}

<style>
  .layout { display: grid; grid-template-columns: 240px 1fr; gap: 16px; height: 100%; }
  .sidebar {
    background: var(--color-bg-1); border: 1px solid var(--color-line-1);
    border-radius: 8px; padding: 6px; overflow-y: auto;
    align-self: start; max-height: calc(100vh - 130px);
  }
  .t-item {
    display: block; width: 100%; text-align: left;
    background: transparent; border: 0;
    padding: 7px 10px; border-radius: 5px;
    cursor: pointer; color: var(--color-fg-1);
  }
  .t-item:hover { background: var(--color-bg-2); }
  .t-item.active { background: var(--color-bg-2); color: var(--color-fg-0); box-shadow: inset 2px 0 0 var(--color-accent); }
  .t-name { font-family: var(--font-mono); font-size: 12px; }
  .main { display: grid; grid-template-rows: auto auto 1fr; gap: 12px; min-width: 0; }

  .filter {
    background: var(--color-bg-1); border: 1px solid var(--color-line-2);
    border-radius: 5px; color: var(--color-fg-0);
    font-family: var(--font-mono); font-size: 12px;
    padding: 4px 10px; width: 200px; height: 28px; outline: none;
  }
  .filter:focus { border-color: var(--color-line-3); }

  .banner {
    padding: 10px 14px; background: var(--color-bg-1);
    border: 1px solid var(--color-line-1); border-radius: 5px;
    font-size: 12px; color: var(--color-fg-1); font-family: var(--font-mono);
  }
  .banner.err { border-color: color-mix(in srgb, var(--color-danger) 50%, transparent); color: var(--color-danger); }

  .table-wrap {
    background: var(--color-bg-1); border: 1px solid var(--color-line-1);
    border-radius: 8px; overflow: auto; min-height: 0;
  }
  table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px; }
  thead { position: sticky; top: 0; background: var(--color-bg-1); z-index: 2; }
  th {
    text-align: left; padding: 10px 12px;
    border-bottom: 1px solid var(--color-line-2);
    font-weight: 500; color: var(--color-fg-1); white-space: nowrap;
  }
  th.num, td.num { width: 50px; color: var(--color-fg-3); text-align: right; padding-right: 14px; }
  .c-name { color: var(--color-fg-0); }
  .pk-mark {
    margin-left: 6px; padding: 1px 5px;
    font-size: 9px; letter-spacing: 0.1em;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    border-radius: 3px;
  }
  tbody tr:hover { background: var(--color-bg-2); }
  td {
    padding: 6px 12px; border-bottom: 1px solid var(--color-line-1);
    color: var(--color-fg-1); white-space: nowrap;
    max-width: 320px; overflow: hidden; text-overflow: ellipsis;
    position: relative;
  }
  td.editable { cursor: text; }
  td.flash::after {
    content: '';
    position: absolute; inset: 0;
    background: color-mix(in srgb, var(--color-ok) 20%, transparent);
    border: 1px solid var(--color-ok);
    border-radius: 3px;
    pointer-events: none;
    animation: cellFlash 500ms var(--ease-out) forwards;
  }
  @keyframes cellFlash {
    0%   { opacity: 1; }
    100% { opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    td.flash::after { animation: none; opacity: 0; }
  }
  .cell.null { color: var(--color-fg-3); font-style: italic; }
  .cell-edit {
    width: 100%; background: var(--color-bg-3);
    border: 1px solid var(--color-accent); border-radius: 3px;
    color: var(--color-fg-0); font-family: inherit; font-size: inherit;
    padding: 4px 6px; outline: none;
  }
  .table-foot {
    padding: 8px 14px; font-size: 11px; color: var(--color-fg-3);
    border-top: 1px solid var(--color-line-1); background: var(--color-bg-0);
    font-family: var(--font-mono); position: sticky; bottom: 0;
  }
  .pk-foot { color: var(--color-accent); }

  /* Diff modal */
  .scrim {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    animation: fadeIn 140ms var(--ease-out);
  }
  .modal {
    position: fixed; z-index: 201;
    top: 18%; left: 50%; transform: translateX(-50%);
    width: min(560px, 92vw);
    background: var(--color-bg-1);
    border: 1px solid var(--color-line-2);
    border-radius: 10px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
    animation: popIn 200ms var(--ease-out);
    overflow: hidden;
  }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes popIn { from { opacity: 0; transform: translate(-50%, -6px) scale(0.98); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
  @media (prefers-reduced-motion: reduce) {
    .scrim, .modal { animation: none; }
  }
  .modal-h {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-line-1);
  }
  .modal-h-l { display: flex; align-items: center; gap: 8px; }
  .modal-h h2 {
    margin: 0;
    font-size: 13px; font-weight: 500;
    color: var(--color-fg-0);
    letter-spacing: -0.01em;
  }
  .icon-btn {
    background: transparent; border: 0;
    color: var(--color-fg-2); cursor: pointer;
    padding: 4px; border-radius: 4px;
  }
  .icon-btn:hover { background: var(--color-bg-2); color: var(--color-fg-0); }

  .modal-body { padding: 14px; }
  .modal-lede { margin: 0 0 12px; font-size: 12px; color: var(--color-fg-2); }
  .modal-lede code { font-family: var(--font-mono); color: var(--color-fg-1); }
  .diff {
    margin: 0;
    padding: 12px;
    background: var(--color-bg-0);
    border: 1px solid var(--color-line-1);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-fg-0);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
  }
  .modal-meta {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 6px 12px;
    margin-top: 12px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .modal-meta > div { display: contents; }
  .modal-meta span { color: var(--color-fg-3); text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; align-self: center; }
  .modal-meta code { display: block; padding: 4px 8px; border-radius: 3px; word-break: break-all; }
  .modal-meta code.before { background: color-mix(in srgb, var(--color-danger) 8%, transparent); color: var(--color-fg-1); }
  .modal-meta code.after { background: color-mix(in srgb, var(--color-ok) 10%, transparent); color: var(--color-fg-0); }

  .modal-f {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--color-line-1);
    background: var(--color-bg-0);
  }

  /* Toast */
  .toast {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    z-index: 150;
    display: flex; align-items: center; gap: 10px;
    padding: 8px 8px 8px 12px;
    background: var(--color-bg-1);
    border: 1px solid var(--color-line-2);
    border-radius: 8px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-fg-1);
    max-width: min(640px, 92vw);
    animation: toastIn 220ms var(--ease-out);
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to   { opacity: 1; transform: translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast { animation: none; }
  }
  .toast-icon {
    width: 6px; height: 6px; border-radius: 9999px;
    background: var(--color-ok);
    box-shadow: 0 0 6px var(--color-ok);
    flex-shrink: 0;
  }
  .toast-msg { display: flex; align-items: baseline; gap: 6px; min-width: 0; overflow: hidden; }
  .toast-msg code { color: var(--color-fg-0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .toast-arrow { color: var(--color-fg-3); }
  .toast-new { color: var(--color-ok); }
  .toast-undo {
    background: var(--color-bg-2);
    border: 1px solid var(--color-line-2);
    color: var(--color-fg-0);
    border-radius: 4px;
    padding: 3px 10px;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  .toast-undo:hover { background: var(--color-accent); color: white; border-color: var(--color-accent); }
  .toast-x {
    background: transparent; border: 0;
    color: var(--color-fg-3); cursor: pointer;
    padding: 4px; border-radius: 3px;
  }
  .toast-x:hover { color: var(--color-fg-1); background: var(--color-bg-2); }
</style>
