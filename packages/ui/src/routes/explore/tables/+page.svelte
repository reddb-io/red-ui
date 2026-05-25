<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import { tables as fixtureTables, type TableSchema } from '$lib/fixtures'
  import { auth, audit } from '$lib/auth.svelte'
  import { connection } from '$lib/connections.svelte'

  let selected = $state(fixtureTables[0].name)
  let filter = $state('')
  let editing = $state<{ row: number; col: string } | null>(null)
  let editValue = $state('')

  // Live state
  let liveCollections = $state<string[]>([])
  let liveRows = $state<Array<Record<string, unknown>>>([])
  let liveColumns = $state<string[]>([])
  let liveError = $state<string | null>(null)
  let loading = $state(false)

  const usingLive = $derived(connection.client !== null && connection.probe.reachable)

  $effect(() => {
    if (!usingLive) {
      liveCollections = []
      return
    }
    const client = connection.client!
    client.collections().then((cs) => {
      // Filter internal system collections
      liveCollections = cs.filter((c) => !c.startsWith('red.') && !c.startsWith('red_'))
      if (liveCollections.length && !liveCollections.includes(selected)) {
        selected = liveCollections[0]
      }
    }).catch((e) => { liveError = e.message })
  })

  $effect(() => {
    if (!usingLive) return
    const client = connection.client!
    const coll = selected
    if (!coll) return
    loading = true
    liveError = null
    client.query(`SELECT * FROM ${coll} LIMIT 200`).then((r) => {
      liveRows = r.result.records.map((rec) => rec.values)
      // Prefer user-visible columns: drop internal columns starting with red_
      liveColumns = r.result.columns.filter((c) => !c.startsWith('red_') && c !== 'body' && c !== 'created_at' && c !== 'updated_at')
      if (liveColumns.length === 0) liveColumns = r.result.columns
      loading = false
    }).catch((e) => { liveError = e.message; loading = false })
  })

  // Computed surface — switches between live and fixtures
  const availableTables = $derived(usingLive ? liveCollections : fixtureTables.map((t) => t.name))
  const fixture = $derived(fixtureTables.find((t) => t.name === selected))
  const columns = $derived(
    usingLive
      ? liveColumns.map((name) => ({ name, type: 'text' as const }))
      : (fixture?.columns ?? []),
  )
  const allRows = $derived(usingLive ? liveRows : (fixture?.sample ?? []))
  const totalRows = $derived(usingLive ? liveRows.length : (fixture?.rows ?? 0))
  const sizeLabel = $derived(usingLive ? `${connection.probe.stats?.store.total_entities ?? '—'} entities (cluster)` : fixture?.size)

  const filteredRows = $derived(
    filter.trim() === ''
      ? allRows
      : allRows.filter((r) => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase())),
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

  function formatCell(v: unknown, type: string) {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    if (type === 'jsonb') return JSON.stringify(v)
    if (type === 'timestamp') return new Date(String(v)).toISOString().slice(0, 19).replace('T', ' ')
    if (type === 'bool') return v ? '✓' : '✗'
    return String(v)
  }
</script>

<div class="layout">
  <aside class="sidebar">
    <div class="aside-label">
      {usingLive ? 'Live collections' : 'Tables · fixtures'} · {availableTables.length}
    </div>
    {#if usingLive}
      <div class="live-badge">
        <Badge tone="ok">live</Badge>
        <span class="rtt">{connection.probe.rtt_ms}ms · {connection.active.label}</span>
      </div>
    {/if}
    {#each availableTables as name}
      {@const fix = fixtureTables.find((t) => t.name === name)}
      <button class="t-item" class:active={name === selected} onclick={() => (selected = name)}>
        <div class="t-name">{name}</div>
        <div class="t-meta">
          {usingLive ? 'live' : `${fix?.rows.toLocaleString() ?? '?'} rows · ${fix?.size ?? ''}`}
        </div>
      </button>
    {/each}
  </aside>

  <section class="main">
    <PageHeader
      eyebrow="Table"
      title={selected || '—'}
      subtitle={usingLive ? `Live · ${connection.active.url} · ${connection.probe.rtt_ms}ms` : 'Fixtures — start docker compose to switch to live data'}
    >
      {#if usingLive}<Badge tone="ok">live</Badge>{:else}<Badge tone="neutral">fixtures</Badge>{/if}
      <Badge tone="neutral">{filteredRows.length} of {totalRows.toLocaleString()} rows</Badge>
      {#if sizeLabel}<Badge tone="neutral">{sizeLabel}</Badge>{/if}

      {#snippet actions()}
        <input class="filter" bind:value={filter} placeholder="Filter… (any column)" />
        <Can action="write" resource="table">
          <Button size="sm" variant="primary">+ Insert row</Button>
        </Can>
        <Can action="delete" resource="table">
          <Button size="sm" variant="danger">Drop table</Button>
          {#snippet fallback()}<Badge tone="neutral">read-only</Badge>{/snippet}
        </Can>
      {/snippet}
    </PageHeader>

    {#if liveError}
      <div class="banner err">
        <strong>Query failed.</strong> {liveError}
        <span class="muted">— showing fixtures fallback when available</span>
      </div>
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
              <th>
                <div class="col-h">
                  <span class="c-name">{c.name}</span>
                  <span class="c-type">{c.type}</span>
                  {#if 'pk' in c && c.pk}<Badge tone="accent">PK</Badge>{/if}
                  {#if 'fk' in c && c.fk}<Badge tone="info">FK → {c.fk.table}</Badge>{/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each filteredRows.slice(0, 80) as row, i}
            <tr>
              <td class="num">{i + 1}</td>
              {#each columns as c}
                {@const isEditing = editing?.row === i && editing.col === c.name}
                <td
                  class:editable={auth.can('write', 'table')}
                  class:pk={'pk' in c && c.pk}
                  ondblclick={() => startEdit(i, c.name, row[c.name])}
                >
                  {#if isEditing}
                    <input
                      class="cell-edit"
                      bind:value={editValue}
                      onblur={commitEdit}
                      onkeydown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') editing = null }}
                      autofocus
                    />
                  {:else}
                    <span class="cell" class:null={row[c.name] === null || row[c.name] === undefined}>
                      {row[c.name] === null || row[c.name] === undefined ? 'NULL' : formatCell(row[c.name], c.type)}
                    </span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="table-foot">
        {#if usingLive}
          Live · {filteredRows.length} of {liveRows.length} fetched (LIMIT 200) · {connection.active.url}
        {:else}
          Fixtures · {Math.min(80, filteredRows.length)} of {filteredRows.length.toLocaleString()} filtered · double-click a cell to edit
        {/if}
      </div>
    </div>
  </section>
</div>

<style>
  .layout { display: grid; grid-template-columns: 260px 1fr; gap: 16px; height: 100%; }

  .sidebar {
    background: var(--bg-1); border: 1px solid var(--line-1);
    border-radius: var(--r-lg); padding: 8px; overflow-y: auto;
    align-self: start; max-height: calc(100vh - 130px);
  }
  .aside-label {
    padding: 8px; font-family: var(--font-mono);
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--fg-3);
  }
  .live-badge {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 8px 8px;
  }
  .rtt { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
  .t-item {
    display: block; width: 100%; text-align: left;
    background: transparent; border: 0;
    padding: 8px 10px; border-radius: var(--r-md);
    cursor: pointer; color: var(--fg-1);
  }
  .t-item:hover { background: var(--bg-2); }
  .t-item.active { background: var(--bg-2); color: var(--fg-0); box-shadow: inset 2px 0 0 var(--accent); }
  .t-name { font-family: var(--font-mono); font-size: 12px; }
  .t-meta { font-size: 10px; color: var(--fg-3); margin-top: 2px; }

  .main { display: grid; grid-template-rows: auto auto 1fr; gap: 12px; min-width: 0; }
  .filter {
    background: var(--bg-1); border: 1px solid var(--line-2);
    border-radius: var(--r-md); color: var(--fg-0);
    font-family: var(--font-mono); font-size: 12px;
    padding: 6px 10px; width: 240px; outline: none;
  }
  .filter:focus { border-color: var(--line-3); }

  .banner {
    padding: 10px 14px;
    background: var(--bg-1);
    border: 1px solid var(--line-1);
    border-radius: var(--r-md);
    font-size: 12px;
    color: var(--fg-1);
    font-family: var(--font-mono);
  }
  .banner.err { border-color: color-mix(in srgb, var(--danger) 50%, transparent); color: var(--danger); }
  .muted { color: var(--fg-3); margin-left: 4px; }

  .table-wrap {
    background: var(--bg-1); border: 1px solid var(--line-1);
    border-radius: var(--r-lg); overflow: auto; min-height: 0;
  }
  table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px; }
  thead { position: sticky; top: 0; background: var(--bg-1); z-index: 2; }
  th {
    text-align: left; padding: 10px 12px;
    border-bottom: 1px solid var(--line-2);
    font-weight: 500; color: var(--fg-1); white-space: nowrap;
  }
  th.num, td.num { width: 50px; color: var(--fg-3); text-align: right; padding-right: 14px; }
  .col-h { display: flex; align-items: center; gap: 6px; }
  .c-name { color: var(--fg-0); }
  .c-type { color: var(--fg-3); font-size: 10px; }

  tbody tr:hover { background: var(--bg-2); }
  td {
    padding: 6px 12px; border-bottom: 1px solid var(--line-1);
    color: var(--fg-1); white-space: nowrap;
    max-width: 320px; overflow: hidden; text-overflow: ellipsis;
  }
  td.pk { color: var(--accent); }
  td.editable { cursor: text; }
  .cell.null { color: var(--fg-3); font-style: italic; }
  .cell-edit {
    width: 100%;
    background: var(--bg-3); border: 1px solid var(--accent);
    border-radius: var(--r-sm); color: var(--fg-0);
    font-family: inherit; font-size: inherit;
    padding: 4px 6px; outline: none;
  }
  .table-foot {
    padding: 8px 14px; font-size: 11px; color: var(--fg-3);
    border-top: 1px solid var(--line-1); background: var(--bg-0);
    font-family: var(--font-mono); position: sticky; bottom: 0;
  }
</style>
