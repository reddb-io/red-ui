<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { auth, audit } from '$lib/auth.svelte'
  import { connection } from '$lib/connections.svelte'
  import { Table2, Database } from 'lucide-svelte'

  let selected = $state<string>('')
  let filter = $state('')
  let editing = $state<{ row: number; col: string } | null>(null)
  let editValue = $state('')

  let collections = $state<string[]>([])
  let rows = $state<Array<Record<string, unknown>>>([])
  let columns = $state<string[]>([])
  let error = $state<string | null>(null)
  let loading = $state(false)

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

  function startEdit(row: number, col: string, value: unknown) {
    if (!auth.can('write', 'table')) return
    editing = { row, col }
    editValue = String(value ?? '')
  }
  function commitEdit() {
    if (!editing) return
    audit.log('write', 'table', `${selected}[${editing.row}].${editing.col}`, `→ ${editValue}`)
    editing = null
  }
  function formatCell(v: unknown) {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }
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
              {#each columns as c}<th><span class="c-name">{c}</span></th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each filteredRows.slice(0, 80) as row, i}
              <tr>
                <td class="num">{i + 1}</td>
                {#each columns as c}
                  {@const isEditing = editing?.row === i && editing.col === c}
                  <td
                    class:editable={auth.can('write', 'table')}
                    ondblclick={() => startEdit(i, c, row[c])}
                  >
                    {#if isEditing}
                      <input
                        class="cell-edit"
                        bind:value={editValue}
                        onblur={commitEdit}
                        onkeydown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') editing = null }}
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
          {filteredRows.length} of {rows.length} fetched (LIMIT 200) · double-click a cell to edit
        </div>
      </div>
    </section>
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
  tbody tr:hover { background: var(--color-bg-2); }
  td {
    padding: 6px 12px; border-bottom: 1px solid var(--color-line-1);
    color: var(--color-fg-1); white-space: nowrap;
    max-width: 320px; overflow: hidden; text-overflow: ellipsis;
  }
  td.editable { cursor: text; }
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
</style>
