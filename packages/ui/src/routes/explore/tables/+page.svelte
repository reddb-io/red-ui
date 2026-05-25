<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import { tables } from '$lib/fixtures'
  import { auth, audit } from '$lib/auth.svelte'

  let selected = $state(tables[0].name)
  let filter = $state('')
  let editing = $state<{ row: number; col: string } | null>(null)
  let editValue = $state('')

  const table = $derived(tables.find((t) => t.name === selected)!)
  const filteredRows = $derived(
    filter.trim() === ''
      ? table.sample
      : table.sample.filter((r) => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()))
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
    if (type === 'jsonb') return JSON.stringify(v)
    if (type === 'timestamp') return new Date(String(v)).toISOString().slice(0, 19).replace('T', ' ')
    if (type === 'bool') return v ? '✓' : '✗'
    return String(v)
  }
</script>

<div class="layout">
  <aside class="sidebar">
    <div class="aside-label">Tables · {tables.length}</div>
    {#each tables as t}
      <button class="t-item" class:active={t.name === selected} onclick={() => (selected = t.name)}>
        <div class="t-name">{t.name}</div>
        <div class="t-meta">{t.rows.toLocaleString()} rows · {t.size}</div>
      </button>
    {/each}
  </aside>

  <section class="main">
    <header class="hdr">
      <div class="h-left">
        <h1>{table.name}</h1>
        <Badge tone="neutral">{table.rows.toLocaleString()} rows</Badge>
        <Badge tone="neutral">{table.size}</Badge>
      </div>
      <div class="h-right">
        <input class="filter" bind:value={filter} placeholder="Filter… (any column)" />
        <Can action="write" resource="table">
          <Button size="sm" variant="primary">+ Insert row</Button>
        </Can>
        <Can action="delete" resource="table">
          <Button size="sm" variant="danger">Drop table</Button>
          {#snippet fallback()}<Badge tone="neutral">read-only</Badge>{/snippet}
        </Can>
      </div>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            {#each table.columns as c}
              <th>
                <div class="col-h">
                  <span class="c-name">{c.name}</span>
                  <span class="c-type">{c.type}</span>
                  {#if c.pk}<Badge tone="accent">PK</Badge>{/if}
                  {#if c.fk}<Badge tone="info">FK → {c.fk.table}</Badge>{/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each filteredRows.slice(0, 80) as row, i}
            <tr>
              <td class="num">{i + 1}</td>
              {#each table.columns as c}
                {@const isEditing = editing?.row === i && editing.col === c.name}
                <td
                  class:editable={auth.can('write', 'table')}
                  class:pk={c.pk}
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
                    <span class="cell" class:null={row[c.name] === null}>
                      {row[c.name] === null ? 'NULL' : formatCell(row[c.name], c.type)}
                    </span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="table-foot">
        Showing {Math.min(80, filteredRows.length)} of {filteredRows.length.toLocaleString()} filtered · double-click a cell to edit
      </div>
    </div>
  </section>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 16px;
    height: 100%;
  }

  .sidebar {
    background: var(--bg-1);
    border: 1px solid var(--line-1);
    border-radius: var(--r-lg);
    padding: 8px;
    overflow-y: auto;
    align-self: start;
    max-height: calc(100vh - 130px);
  }
  .aside-label {
    padding: 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-3);
  }
  .t-item {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 8px 10px;
    border-radius: var(--r-md);
    cursor: pointer;
    color: var(--fg-1);
  }
  .t-item:hover { background: var(--bg-2); }
  .t-item.active { background: var(--bg-2); color: var(--fg-0); box-shadow: inset 2px 0 0 var(--accent); }
  .t-name { font-family: var(--font-mono); font-size: 12px; }
  .t-meta { font-size: 10px; color: var(--fg-3); margin-top: 2px; }

  .main { display: grid; grid-template-rows: auto 1fr; gap: 12px; min-width: 0; }
  .hdr {
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
    flex-wrap: wrap;
  }
  .h-left { display: flex; align-items: center; gap: 8px; }
  .h-right { display: flex; align-items: center; gap: 6px; }
  h1 { font-size: 18px; margin: 0; font-weight: 600; letter-spacing: -0.01em; }
  .filter {
    background: var(--bg-1);
    border: 1px solid var(--line-2);
    border-radius: var(--r-md);
    color: var(--fg-0);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 6px 10px;
    width: 240px;
    outline: none;
  }
  .filter:focus { border-color: var(--line-3); }

  .table-wrap {
    background: var(--bg-1);
    border: 1px solid var(--line-1);
    border-radius: var(--r-lg);
    overflow: auto;
    min-height: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  thead { position: sticky; top: 0; background: var(--bg-1); z-index: 2; }
  th {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line-2);
    font-weight: 500;
    color: var(--fg-1);
    white-space: nowrap;
  }
  th.num, td.num { width: 50px; color: var(--fg-3); text-align: right; padding-right: 14px; }
  .col-h { display: flex; align-items: center; gap: 6px; }
  .c-name { color: var(--fg-0); }
  .c-type { color: var(--fg-3); font-size: 10px; }

  tbody tr { transition: background 80ms; }
  tbody tr:hover { background: var(--bg-2); }
  td {
    padding: 6px 12px;
    border-bottom: 1px solid var(--line-1);
    color: var(--fg-1);
    white-space: nowrap;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  td.pk { color: var(--accent); }
  td.editable { cursor: text; }
  .cell.null { color: var(--fg-3); font-style: italic; }
  .cell-edit {
    width: 100%;
    background: var(--bg-3);
    border: 1px solid var(--accent);
    border-radius: var(--r-sm);
    color: var(--fg-0);
    font-family: inherit;
    font-size: inherit;
    padding: 4px 6px;
    outline: none;
  }
  .table-foot {
    padding: 8px 14px;
    font-size: 11px;
    color: var(--fg-3);
    border-top: 1px solid var(--line-1);
    background: var(--bg-0);
    font-family: var(--font-mono);
    position: sticky;
    bottom: 0;
  }
</style>
