<script lang="ts">
  import {
    Button,
    Input,
    Checkbox,
    EmptyState,
    StateIllustration,
    quietControl,
  } from "@reddb-io/design-system/base";
  import {
    tableEmptyCompact,
    searchEmpty,
  } from "@reddb-io/design-system/base/illustrations";
  import Table from "./Table.svelte";
  import {
    tableQueryRequest,
    filterTableRows,
    explorerTableColumns,
  } from "./table-explorer";
  import { explorerClasses as styles } from "./diff-explorer.variants";
  import type { TableExplorerContract } from "./core/contracts/tableexplorer";
  interface Props extends TableExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let {
    label,
    columns,
    rows,
    rowKey,
    total,
    context,
    error,
    editable = false,
    changes = [],
    onchangeschange,
    queryColumns = [],
    onquery,
    onreset,
    describequery,
    identityLabel,
    class: className = "",
  }: Props = $props();
  let filters = $state<Record<string, string>>({}),
    filtersOpen = $state(false),
    projectionOpen = $state(false),
    projection = $state<Record<string, boolean>>({}),
    limit = $state(200),
    busy = $state(false),
    queryError = $state<string | null>(null),
    root: HTMLElement;
  let controller: AbortController | undefined;
  $effect(() => {
    void context;
    controller?.abort();
    filters = {};
    projection = {};
    queryError = null;
    busy = false;
    return () => controller?.abort();
  });
  const visible = $derived(filterTableRows(rows, filters)),
    gridColumns = $derived(explorerTableColumns(columns, visible)),
    count = $derived(
      Object.values(filters).filter((value) => value.trim()).length,
    );
  const request = $derived(
    tableQueryRequest(
      queryColumns.filter((key) => projection[key] !== false),
      limit,
    ),
  );
  function reset() {
    controller?.abort();
    busy = false;
    onreset?.();
    clear();
    queryError = null;
  }
  function clear() {
    filters = {};
    root
      .querySelector<HTMLButtonElement>("[data-table-filter-toggle]")
      ?.focus();
  }
  async function run() {
    if (!onquery || busy) return;
    controller?.abort();
    const task = new AbortController();
    controller = task;
    busy = true;
    queryError = null;
    try {
      await onquery(request, task.signal);
      if (!task.signal.aborted) filters = {};
    } catch (cause) {
      if (!task.signal.aborted)
        queryError = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (controller === task && !task.signal.aborted) {
        busy = false;
        root
          .querySelector<HTMLButtonElement>("[data-table-run-select]")
          ?.focus();
      }
    }
  }
  function sourceKey(row: Record<string, unknown>) {
    return typeof rowKey === "function"
      ? rowKey(row, rows.indexOf(row))
      : (row[rowKey] as string | number);
  }
</script>

<section
  bind:this={root}
  data-table-explorer
  aria-label={label}
  class={`${styles.root} ${className}`}
>
  {#if error}<p role="alert" class={styles.detail}>{error}</p>{:else}
    <div class={styles.toolbar}>
      {#if onquery}<Button
          aria-pressed={projectionOpen}
          onclick={() => (projectionOpen = !projectionOpen)}>select</Button
        ><Button data-table-run-select disabled={busy} onclick={run}
          >{busy ? "Running…" : "run"}</Button
        >{#if onreset}<Button onclick={reset}>reset</Button>{/if}{/if}
      <button
        type="button"
        data-table-filter-toggle
        class={quietControl({
          selected: filtersOpen,
          class: "px-[var(--reddb-spatial-inset-sm)]",
        })}
        aria-pressed={filtersOpen}
        onclick={() => (filtersOpen = !filtersOpen)}
        >filters{count ? ` ${count}` : ""}</button
      >
      {#if count}<Button title="Clear all filters" onclick={clear}>clear</Button
        >{/if}<span>{visible.length} of {total ?? rows.length} rows</span>
    </div>
    {#if projectionOpen && onquery}<div class={styles.detail}>
        <div class={styles.toolbar}>
          <span>Columns</span><Button onclick={() => (projection = {})}
            >all</Button
          ><Button
            onclick={() =>
              (projection = Object.fromEntries(
                queryColumns.map((key) => [key, false]),
              ))}>none</Button
          ><label
            >Limit <Input
              aria-label="Limit"
              type="number"
              min="1"
              max="1000"
              bind:value={limit}
            /></label
          >
        </div>
        <div class={styles.toolbar}>
          {#each queryColumns as key (key)}<Checkbox
              label={key}
              checked={projection[key] !== false}
              oncheckedchange={(value) =>
                (projection = { ...projection, [key]: value })}
            />{/each}
        </div>
        {#if describequery}<pre class={styles.value}>{describequery(
              request,
            )}</pre>{/if}
      </div>{/if}
    {#if queryError}<p role="alert" class={styles.detail}>{queryError}</p>{/if}
    {#if filtersOpen}<div class={styles.toolbar} data-table-filters>
        {#each columns as column (column.key)}<label
            >{column.header}<Input
              aria-label={`Filter ${column.key}`}
              value={filters[column.key] ?? ""}
              onvaluechange={(value) =>
                (filters = { ...filters, [column.key]: String(value ?? "") })}
            /></label
          >{/each}
      </div>{/if}
    {#if !rows.length}<div
        data-renderer-empty="table"
        data-empty-reason="empty"
        class={styles.detail}
      >
        <EmptyState
          title="No rows returned"
          description="This query returned no rows. Adjust the query or run it again."
          bordered={false}
          >{#snippet media()}<StateIllustration
              art={tableEmptyCompact}
              size="md"
            />{/snippet}{#snippet actions()}{#if onquery}<Button
                disabled={busy}
                onclick={run}>Run SELECT again</Button
              >{/if}{/snippet}</EmptyState
        >
      </div>
    {:else}<Table
        caption={label}
        captionHidden
        columns={gridColumns}
        rows={visible}
        rowKey={sourceKey}
        {editable}
        {changes}
        {onchangeschange}
        pageSize={80}
        columnVisibility={false}
      >
        {#snippet cell({
          column,
          value,
          text,
        })}{#if column.key !== gridColumns[0]?.key && value == null}<span
              class="italic text-ink-muted">NULL</span
            >{:else}<span class="block max-w-prose truncate">{text}</span
            >{/if}{/snippet}
        {#snippet empty()}<div
            data-renderer-empty="table"
            data-empty-reason="filtered"
          >
            <EmptyState
              title="No rows match these filters"
              description="Clear the column filters to show the returned rows."
              bordered={false}
              >{#snippet media()}<StateIllustration
                  art={searchEmpty}
                  size="sm"
                />{/snippet}{#snippet actions()}<Button onclick={clear}
                  >Clear filters</Button
                >{/snippet}</EmptyState
            >
          </div>{/snippet}
      </Table>{/if}
    <p class={styles.detail}>
      {visible.length} of {total ?? rows.length} rows{context
        ? ` · ${context}`
        : ""}{identityLabel ? ` · ${identityLabel}` : ""}{editable
        ? " · double-click or press Enter to stage an edit"
        : ""}
    </p>
  {/if}
</section>
