<script lang="ts">
  import { Button, quietControl } from "@reddb-io/design-system/base";
  import TimeSeries from "./TimeSeries.svelte";
  import Table from "./Table.svelte";
  import type { TableColumn } from "./table";
  import {
    normalizeEventPoints,
    bucketOptions,
    bucketLabel,
    effectiveBucketMs,
    seriesBuckets,
    formatEventTime,
    eventPayload,
  } from "./event-series-explorer";
  import { explorerClasses as styles } from "./diff-explorer.variants";
  import type { EventSeriesExplorerContract } from "./core/contracts/eventseriesexplorer";
  interface Props extends EventSeriesExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let {
    label,
    series,
    context,
    emptyLabel = "No time series to inspect.",
    class: className = "",
  }: Props = $props();
  let metric = $state("");
  let mode = $state("rate");
  let requested = $state(60000);
  let selected = $state<number | null>(null);
  const current = $derived(
    series.find((item) => item.id === metric) ?? series[0],
  );
  const points = $derived(normalizeEventPoints(current?.points ?? []));
  const interval = $derived(effectiveBucketMs(points, requested));
  const buckets = $derived(seriesBuckets(points, interval));
  const selection = $derived(
    buckets.some((bucket) => bucket.t === selected) ? selected : null,
  );
  const visible = $derived(
    points.filter(
      (point) =>
        selection === null ||
        (point.t >= selection && point.t < selection + interval),
    ),
  );
  const plot = $derived(
    mode === "rate"
      ? buckets.map((bucket) => ({ x: new Date(bucket.t), y: bucket.count }))
      : points.map((point) => ({ x: new Date(point.t), y: point.v })),
  );
  const rows = $derived(
    visible.map((point, id) => ({
      id,
      time: formatEventTime(point.t),
      value: point.v,
      log: eventPayload(point.raw),
    })),
  );
  const columns: TableColumn[] = [
    { key: "time", header: "time" },
    { key: "value", header: "value", align: "end" },
    { key: "log", header: "log" },
  ];
  const selectClass = styles.select;
</script>

<section
  data-event-series-explorer
  aria-label={label}
  class={`${styles.root} ${className}`}
>
  {#if !current}<p class={styles.detail}>{emptyLabel}</p>{:else}
    <div class={styles.toolbar}>
      <button
        type="button"
        class={quietControl({
          selected: mode === "rate",
          class: "px-[var(--reddb-spatial-inset-sm)]",
        })}
        aria-pressed={mode === "rate"}
        onclick={() => (mode = "rate")}>Writes/{bucketLabel(interval)}</button
      >
      <button
        type="button"
        class={quietControl({
          selected: mode === "line",
          class: "px-[var(--reddb-spatial-inset-sm)]",
        })}
        aria-pressed={mode === "line"}
        onclick={() => (mode = "line")}>Value</button
      >
      <label class="flex min-w-0 max-w-full flex-col"
        >Metric <select
          class={selectClass}
          value={current.id}
          onchange={(event) => {
            metric = event.currentTarget.value;
            selected = null;
          }}
          >{#each series as item (item.id)}<option value={item.id}
              >{item.label}</option
            >{/each}</select
        ></label
      >
      {#if mode === "rate"}<label class="flex min-w-0 max-w-full flex-col"
          >Bucket <select
            class={selectClass}
            value={requested}
            onchange={(event) => {
              requested = Number(event.currentTarget.value);
              selected = null;
            }}
            >{#each bucketOptions as ms}<option value={ms}
                >{bucketLabel(ms)}</option
              >{/each}</select
          ></label
        >{/if}
      <label class="flex min-w-0 max-w-full flex-col"
        >Inspect bucket <select
          class={selectClass}
          value={selection === null ? "" : String(selection)}
          onchange={(event) =>
            (selected =
              event.currentTarget.value === ""
                ? null
                : Number(event.currentTarget.value))}
          ><option value="">All events</option
          >{#each buckets as bucket (bucket.t)}<option value={String(bucket.t)}
              >{formatEventTime(bucket.t)} · {bucket.count} writes · sum {bucket.sum}</option
            >{/each}</select
        ></label
      >
      {#if selection !== null}<Button onclick={() => (selected = null)}
          >Clear bucket</Button
        >{/if}
    </div>
    <TimeSeries
      label={`${label}: ${mode === "rate" ? "writes per bucket" : current.label}`}
      data={plot}
      variant={mode === "rate" ? "bar" : "line"}
      curve="linear"
      size="md"
      onselect={mode === "rate" ? value => selected = value : undefined}
      interactive
    />
    <Table
      caption={`${label} events`}
      captionHidden
      {columns}
      {rows}
      rowKey="id"
      pageSize={80}
      columnVisibility={false}
    />
    <p class={styles.detail}>
      {visible.length} inserts{context ? ` · ${context}` : ""}{selection !==
      null
        ? ` · bucket ${formatEventTime(selection)}`
        : ""}
    </p>
  {/if}
</section>
