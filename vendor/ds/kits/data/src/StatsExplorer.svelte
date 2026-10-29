<script module lang="ts">
  export { formatStatsMetric, statsGaugePercent } from "./stats-explorer";
  export type { StatsMetric } from "./stats-explorer";
</script>
<script lang="ts">
  import { quietControl } from "@reddb-io/design-system/base";
  import KpiCard from "./KpiCard.svelte";
  import Table from "./Table.svelte";
  import type { TableColumn } from "./table";
  import { formatStatsMetric, statsGaugePercent } from "./stats-explorer";
  import { statsExplorerClasses as styles } from "./stats-explorer.variants";
  import type { StatsExplorerContract } from "./core/contracts/statsexplorer";
  interface Props extends StatsExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let { label, metrics, context, emptyLabel = "No numeric statistics in this result.", class: className = "" }: Props = $props();
  let mode = $state<"kpi" | "gauge" | "table">("kpi");
  const columns: TableColumn[] = [{ key: "label", header: "Metric" }, { key: "value", header: "Value", align: "end" }, { key: "unit", header: "Unit" }];
  const rows = $derived(metrics.map((metric, id) => ({ id, label: metric.label, value: metric.value.toLocaleString(), unit: metric.unit || "-" })));
  const maximum = $derived(metrics.reduce((max, metric) => Math.max(max, Math.abs(metric.value)), 1));
</script>
<section data-stats-explorer aria-label={label} class={`${styles.root} ${className}`}>
  {#if metrics.length === 0}<p class={styles.content}>{emptyLabel}</p>{:else}
    <div class={styles.toolbar}>
      <button type="button" class={quietControl({selected: mode === "kpi", class: "px-[var(--reddb-spatial-inset-sm)]"})} aria-pressed={mode === "kpi"} onclick={() => mode = "kpi"}>kpis</button>
      <button type="button" class={quietControl({selected: mode === "gauge", class: "px-[var(--reddb-spatial-inset-sm)]"})} aria-pressed={mode === "gauge"} onclick={() => mode = "gauge"}>gauges</button>
      <button type="button" class={quietControl({selected: mode === "table", class: "px-[var(--reddb-spatial-inset-sm)]"})} aria-pressed={mode === "table"} onclick={() => mode = "table"}>table</button>
      <span>{metrics.length.toLocaleString()} metrics</span>{#if context}<span class="text-ink-muted">{context}</span>{/if}
    </div>
    {#if mode === "table"}
      <Table caption={label} captionHidden {columns} {rows} rowKey="id" pageSize={Math.max(1, rows.length)} columnVisibility={false} />
    {:else}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named region is scrollable by keyboard.) -->
      <div class={styles.content} role="region" aria-label={`${label} values`} tabindex="0"><div class={styles.grid}>
        {#each metrics as metric, index (`${metric.key}-${index}`)}
          {#if mode === "kpi"}<KpiCard label={metric.label} value={formatStatsMetric(metric.value, metric.unit)} />{:else}
            <div class={styles.gauge}>
              <svg viewBox="0 0 120 70" class={styles.svg} role="img" aria-label={`${metric.label} gauge`}>
                <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="var(--reddb-color-muted)" stroke-width="10" stroke-linecap="round" />
                <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="var(--reddb-color-foreground)" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray={`${statsGaugePercent(metric.value, maximum)} 100`} />
              </svg>
              <p>{metric.label}: {formatStatsMetric(metric.value, metric.unit)}</p>
            </div>
          {/if}
        {/each}
      </div></div>
    {/if}
  {/if}
</section>
