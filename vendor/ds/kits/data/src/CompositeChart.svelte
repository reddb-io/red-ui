<script module lang="ts">
  export type { CompositeX, CompositePoint, CandlePoint, CompositeChartSeries, CompositeValueSeries, CompositeCandleSeries, CompositeAxis, CompositeReference } from "./core/composite-chart";
  export type { ChartSize, ChartSeries, ChartLayout, ChartReadout, ChartHeight, ChartTimestamp, ChartTimeRange } from "./chart";
  export type { ChartLoading } from "./chart-loading";
</script>
<script lang="ts">
  import { Button, Dialog } from "@reddb-io/design-system/base";
  import type { CompositeChartContract } from "./core/contracts/compositechart";
  import { resolveCompositeChart } from "./core/composite-chart";
  import { compositeChart } from "./composite-chart.variants";
  import Panel from "./internal/CompositeChartPanel.svelte";
  interface Props extends CompositeChartContract {
    /** Reports legend visibility changes from either presentation. */
    onhiddenserieschange?: (ids: readonly string[]) => void;
    /** Reports linked inspection as an epoch timestamp, or null to clear it. */
    onactivexchange?: (value: number | null) => void;
    /** Reports maximization and dismissal. */
    onexpandedchange?: (expanded: boolean) => void;
    /** Extra classes on the chart's outer surface. */
    class?: string;
  }
  let { categoryLabelAngle = 0, palette, columnMode = "grouped", barPadding = 0.28, strokeWidth, dataLabels = "none", showTotals = false, data, label, timeRange, activeX = $bindable(null), onactivexchange, layout = "roomy", readout = "auto", orientation = "vertical", primaryAxis, secondaryAxis, references = [], formatX,
    presentation = "full", legend = "compact", interactive = true, hiddenSeries = $bindable([]),
    expandable = true, expanded = $bindable(false), expandLabel = "Maximize", restoreLabel = "Restore",
    size, height, loading = "lazy", onhiddenserieschange, onexpandedchange, class: className = "" }: Props = $props();
  const styles = compositeChart();
  const model = $derived(resolveCompositeChart(data, orientation, primaryAxis, secondaryAxis, references, timeRange, { categoryLabelAngle, palette, columnMode, barPadding, strokeWidth, dataLabels, showTotals }));
  const panel = $derived({ model, label, layoutMode: layout, readoutMode: readout, orientation, primaryAxis, secondaryAxis, formatX, presentation, legend, interactive, hiddenSeries, activeX, size, height, loading });
  function inspect(value: number | null): void { activeX = value; onactivexchange?.(value); }
  function toggle(id: string): void {
    hiddenSeries = hiddenSeries.includes(id) ? hiddenSeries.filter(value => value !== id) : [...hiddenSeries, id];
    onhiddenserieschange?.(hiddenSeries);
  }
  function expand(): void { expanded = true; onexpandedchange?.(true); }
</script>

<section data-composite-chart aria-label={label} class={styles.root({ class: `${height === "fill" ? "h-full" : ""} ${className}` })}>
  <Panel {...panel} onactivechange={inspect} ontoggle={toggle}>
    {#snippet actions()}{#if expandable}<Button variant="ghost" size="sm" aria-label={`${expandLabel} ${label}`} onclick={expand}>{expandLabel}</Button>{/if}{/snippet}
  </Panel>
  <Dialog title={label} size="xl" bind:open={expanded} onopenchange={onexpandedchange} class={styles.dialog()}>
    {#snippet header({ close })}<div class={styles.header()}><span class="text-caption font-medium">{label}</span><Button variant="ghost" size="sm" onclick={close}>{restoreLabel}</Button></div>{/snippet}
    {#if expanded}
      <div data-composite-expanded class="h-full min-h-0">
        <Panel {...panel} fill loading="eager" onactivechange={inspect} ontoggle={toggle} />
      </div>
    {/if}
  </Dialog>
</section>
