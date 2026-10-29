<script lang="ts">
  import { Button, Input, quietControl } from "@reddb-io/design-system/base";
  import Table from "./Table.svelte";
  import type { TableColumn } from "./table";
  import {
    filterVectorRows,
    compactValue,
    scalarLabel,
    vectorMagnitude,
    vectorSearchRequest,
    vectorCoordinatePercent,
    type VectorSearchResponse,
  } from "./vector-explorer";
  import { explorerClasses as styles } from "./diff-explorer.variants";
  import type { VectorExplorerContract } from "./core/contracts/vectorexplorer";
  interface Props extends VectorExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let {
    label,
    rows,
    context,
    searchResults,
    onsearch,
    class: className = "",
  }: Props = $props();
  let surface = $state("browse"),
    mode = $state("metadata"),
    kind = $state<"text" | "vector">("text"),
    text = $state(""),
    vector = $state(""),
    limit = $state(20),
    filter = $state("");
  let selected = $state<number | null>(null),
    response = $state<VectorSearchResponse>(),
    busy = $state(false),
    error = $state<string | null>(null),
    filterInput = $state<HTMLInputElement>();
  let controller: AbortController | undefined;
  $effect(() => {
    void context;
    void rows;
    controller?.abort();
    response = undefined;
    busy = false;
    error = null;
    selected = null;
    return () => controller?.abort();
  });
  const incoming = $derived(response ?? searchResults);
  const visible = $derived(
    filterVectorRows(
      surface === "search" ? (incoming?.rows ?? []) : rows,
      filter,
    ),
  );
  const active = $derived(
    visible.find((row) => row.index === selected) ?? visible[0],
  );
  const scoreRows = $derived(
    visible.map((row) => ({
      index: row.index,
      id: row.id,
      score: row.scalar === null ? "n/a" : row.scalar.toFixed(6),
      metric: scalarLabel(row),
      magnitude: vectorMagnitude(row.vector).toFixed(6),
    })),
  );
  const columns: TableColumn[] = [
    { key: "id", header: "id" },
    { key: "score", header: "ranking metric", align: "end" },
    { key: "metric", header: "metric type" },
    { key: "magnitude", header: "magnitude", align: "end" },
  ];
  async function search() {
    if (!onsearch) return;
    controller?.abort();
    const task = new AbortController();
    controller = task;
    error = null;
    busy = true;
    try {
      const request = vectorSearchRequest(
        kind,
        kind === "text" ? text : vector,
        limit,
      );
      const next = await onsearch(request, task.signal);
      if (task.signal.aborted) return;
      response = next;
      selected = null;
      mode = "metadata";
    } catch (cause) {
      if (!task.signal.aborted)
        error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (controller === task && !task.signal.aborted) busy = false;
    }
  }
</script>

<section
  data-vector-explorer
  aria-label={label}
  class={`@container ${styles.root} ${className}`}
>
  <div class={styles.toolbar}>
    {#each ["browse", "search"] as view}<button
        type="button"
        class={quietControl({
          selected: surface === view,
          class: "px-[var(--reddb-spatial-inset-sm)]",
        })}
        aria-pressed={surface === view}
        onclick={() => {
          surface = view;
          selected = null;
        }}>{view}</button
      >{/each}
    <span
      >{rows.find((row) => row.dimension > 0)?.dimension ?? 0}d{context
        ? ` · ${context}`
        : ""}</span
    >
  </div>
  {#if surface === "search"}
    <form
      class={styles.toolbar}
      onsubmit={(event) => {
        event.preventDefault();
        void search();
      }}
    >
      {#each ["text", "vector"] as source}<button
          type="button"
          class={quietControl({
            selected: kind === source,
            class: "px-[var(--reddb-spatial-inset-sm)]",
          })}
          aria-pressed={kind === source}
          onclick={() => (kind = source as typeof kind)}>{source}</button
        >{/each}
      {#if kind === "text"}<label
          >Search text <Input
            aria-label="Search text"
            bind:value={text}
          /></label
        >{:else}<label
          >Query vector <Input
            aria-label="Query vector"
            bind:value={vector}
          /></label
        >{/if}
      <label
        >Limit <Input
          aria-label="Limit"
          type="number"
          min="1"
          max="200"
          bind:value={limit}
        /></label
      >
      <Button type="submit" disabled={busy || !onsearch}
        >{busy ? "Searching…" : "Run search"}</Button
      >
      {#if busy}<Button
          onclick={() => {
            controller?.abort();
            busy = false;
          }}>Cancel search</Button
        >{/if}
      {#if !onsearch}<p>Search is not available for this dataset.</p>{/if}
    </form>
    {#if error}<p role="alert" class={styles.detail}>{error}</p>{/if}
    {#if incoming?.note}<p class={styles.detail}>{incoming.note}</p>{/if}
  {/if}
  <div class={styles.toolbar}>
    {#each ["metadata", "vector", "scores"] as view}<button
        type="button"
        class={quietControl({
          selected: mode === view,
          class: "px-[var(--reddb-spatial-inset-sm)]",
        })}
        aria-pressed={mode === view}
        onclick={() => (mode = view)}>{view}</button
      >{/each}
    <label
      >Filter vectors <Input
        type="search"
        aria-label="Filter vectors"
        bind:value={filter}
        bind:ref={filterInput}
      /></label
    >
    {#if filter}<Button
        onclick={() => {
          filter = "";
          filterInput?.focus();
        }}>Clear filter</Button
      >{/if}<span>{visible.length} rows</span>
  </div>
  {#if !visible.length}<p class={styles.detail}>
      {filter
        ? "No vectors match the filter."
        : surface === "search" && !incoming
          ? "No vector search has been run."
          : "No vector rows returned."}
    </p>
  {:else if mode === "scores"}<Table
      caption="Vector scores"
      captionHidden
      {columns}
      rows={scoreRows}
      rowKey="index"
      pageSize={80}
      columnVisibility={false}
    />
  {:else}<div class={styles.content}>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named keyboard scroll region.) -->
      <div role="region" aria-label="Vectors" tabindex="0" class={styles.list}>
        {#each visible as row (row.index)}<button
            type="button"
            class={quietControl({
              selected: active?.index === row.index,
              focus: "inset",
              class: styles.row,
            })}
            aria-pressed={active?.index === row.index}
            onclick={() => (selected = row.index)}
            ><span>{row.id}</span><span>{row.dimension}d</span><span
              >{Object.entries(row.metadata)
                .slice(0, 3)
                .map(([key, value]) => `${key}=${compactValue(value)}`)
                .join(" · ")}</span
            ></button
          >{/each}
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named keyboard scroll region.) -->
      <div
        role="region"
        aria-label="Vector details"
        tabindex="0"
        class={styles.detail}
      >
        {#if active}<p>
            {active.id} · {active.dimension}d · magnitude {active.vector.length
              ? vectorMagnitude(active.vector).toFixed(6)
              : "n/a"}
          </p>
          {#if mode === "metadata"}<p>
              coordinates: {active.vector.length
                ? "returned"
                : "not returned"}{active.vectorColumn
                ? ` · ${active.vectorColumn}`
                : ""}
            </p>
            {#if active.scalarColumn}<p>
                {scalarLabel(active)}: {active.scalar ?? "n/a"}
              </p>{/if}
            <dl>
              {#each Object.entries(active.metadata) as [key, value]}<dt
                  class="text-ink-muted"
                >
                  {key}
                </dt>
                <dd class={styles.value}>{compactValue(value)}</dd>{/each}
            </dl>
          {:else if !active.vector.length}<p>
              This result reports a {active.dimension}d vector, but the
              coordinate array was not returned.
            </p>
          {:else}<p>{active.vector.length} dimensions</p>
            {#each active.vector.slice(0, 256) as value, index}<div
                class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[var(--reddb-spatial-gap-md)]"
              >
                <span>{index}</span>
                <div
                  role="meter"
                  class={styles.coordinateTrack}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={vectorCoordinatePercent(value, active.vector)}
                  aria-label={`Coordinate ${index} magnitude`}
                >
                  <div
                    class={styles.coordinateBar}
                    style:width={`${vectorCoordinatePercent(value, active.vector)}%`}
                  ></div>
                </div>
                <span>{value.toFixed(5)}</span>
              </div>{/each}{#if active.vector.length > 256}<p>
                Showing first 256 dimensions.
              </p>{/if}
            <details>
              <summary>Full coordinates</summary>
              <pre class={styles.value}>{JSON.stringify(active.vector)}</pre>
            </details>{/if}
        {/if}
      </div>
    </div>{/if}
</section>
