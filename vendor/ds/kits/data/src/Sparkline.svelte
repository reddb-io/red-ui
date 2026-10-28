<!-- Compact trend marks; LayerChart-powered per ADR 0013. -->
<script module lang="ts">
  export type { SparklineVariant } from "./chart";
  export type { ChartCurve, ChartSeries } from "./chart";
  export type { ChartLoading } from "./chart-loading";
</script>

<script lang="ts">
  import { Skeleton } from "@reddb-io/design-system/base";
  import { tokenColor } from "@reddb-io/design-system/base/recipes";

  import type { SparklineContract } from "./core/contracts/sparkline";
  import { onMount } from "svelte";
  import { COMFORTABLE_CHART_RHYTHM, observeChartRhythm, type ChartCurve, type ChartSeries, type SparklineVariant } from "./chart";
  import { chartFigure } from "./chart.variants";
  import { sparklineEngine } from "./chart-engines";
  import { lazyChart } from "./chart-loader.svelte";
  import type { ChartLoading } from "./chart-loading";

  interface Props extends SparklineContract {
    /** Extra classes, merged onto the chart's root `figure`. */
    class?: string;
  }

  let {
    values,
    label = "Trend",
    strokeWidth = 2, series = 1, color,
    variant = "line",
    curve = "smooth",
    width,
    height,
    loading = "lazy",
    class: className = "",
  }: Props = $props();

  const ROWS = 1.5;
  let box = $state<DOMRectReadOnly>();
  let rhythm = $state(COMFORTABLE_CHART_RHYTHM);
  let probe: HTMLElement;
  let figure = $state<HTMLElement>();
  const chart = lazyChart(sparklineEngine, () => figure, () => loading);
  onMount(() => observeChartRhythm(probe, (next) => (rhythm = next)));

  const data = $derived(values.map((y, x) => ({ x, y })));
  const drawingWidth = $derived(width ?? (box && box.width > 0 ? Math.floor(box.width) : 160));
  const drawingHeight = $derived(height ?? Math.round(rhythm.row * ROWS));
</script>

<figure
  bind:this={figure}
  data-ds-chart
  aria-busy={!chart.Engine || undefined}
  data-chart-loaded={chart.Engine ? "" : undefined}
  data-chart-kind="sparkline"
  data-chart-variant={variant}
  data-chart-series={series}
  data-chart-width={width === undefined ? "fluid" : "fixed"}
  bind:contentRect={box}
  role="img"
  aria-label={label}
  style:--color-primary={tokenColor(color, `var(--reddb-color-series-${series})`)}
  class={chartFigure({ series, fluid: width === undefined, class: `${width === undefined ? "block w-full" : "inline-block max-w-full"} ${className}` })}
>
  <span
    bind:this={probe}
    data-chart-rhythm-probe
    aria-hidden="true"
    class="pointer-events-none invisible absolute start-0 top-0 h-[var(--reddb-spatial-control-height-md)] w-[var(--reddb-spatial-inset-sm)]"
  ></span>
  {#if chart.Engine}
    {@const Engine = chart.Engine}
    <Engine {strokeWidth} {data} {curve} {variant} width={drawingWidth} height={drawingHeight} />
  {:else}
    <!-- The drawing's own height before it exists: `height`, or ROWS of the
         Density's control height — the length the probe reads once mounted —
         so the swap to the engine moves nothing (CLS 0) at every stop. -->
    <div
      data-chart-placeholder
      aria-hidden="true"
      class="max-w-full"
      style:height={height === undefined ? `calc(var(--reddb-spatial-control-height-md) * ${ROWS})` : `${height}px`}
      style:width={width === undefined ? "100%" : `${width}px`}
    ><Skeleton shape={variant === "bar" ? "column" : variant} class="h-full max-w-none" /></div>
  {/if}
</figure>
