<!-- Line and area time series powered by LayerChart's SVG layer. -->
<script module lang="ts">
  export type { ChartCurve, ChartNumberFormat, ChartSeries, ChartSize, ChartLayout, ChartReadout, ChartHeight, ChartTimestamp, ChartTimeRange } from "./chart";
  export type { ChartLoading } from "./chart-loading";

  export type { TimeSeriesPoint, TimeSeriesDataset } from "./time-series";

  export type { TimeSeriesVariant } from "./time-series";
</script>

<script lang="ts">
  import { Skeleton } from "@reddb-io/design-system/base";
  import { tokenColor } from "@reddb-io/design-system/base/recipes";

  import type { TimeSeriesContract } from "./core/contracts/timeseries";
  import { onMount } from "svelte";
  import { quietControl } from "@reddb-io/design-system/base";
  import { timeSeriesPadding, formatTimeSample, nearestTimeIndex, timeSeriesBars, timeSeriesDatasets, timeSeriesDomain, timeSeriesSamples, timeSeriesValueDomain, type TimeSeriesPoint, type TimeSeriesDataset, type TimeSeriesVariant } from "./time-series";
  import {
    COMFORTABLE_CHART_RHYTHM,
    formatChartNumber,
    observeChartRhythm,
    type ChartNumberFormat,
    type ChartCurve,
    type ChartSeries,
    type ChartSize,
  } from "./chart";
  import { chartTimeRange, chartTimeIndex, chartCursor } from "./core/chart-time";
  import { chartSurface, chartReadout, chartRows, chartHeightStyle, chartAdaptiveHeight } from "./chart-layout.variants";
  import { chartFigure } from "./chart.variants";
  import { timeSeriesEngine } from "./chart-engines";
  import { lazyChart } from "./chart-loader.svelte";
  import type { ChartLoading } from "./chart-loading";

  interface Props extends TimeSeriesContract {
    /** Called after a legend action changes hidden dataset ids. */
    onhiddenserieschange?: (ids: readonly string[]) => void;
    /** Reports linked inspection as an epoch timestamp, or null to clear it. */
    onactivexchange?: (value: number | null) => void;
    /** Commits a sample with a pointer press or Enter/Space, independently of hover inspection. */
    onselect?: (value: number) => void;
    /** Extra classes, merged onto the chart's root `figure`. */
    class?: string;
  }

  let {
    data,
    timeRange,
    activeX = $bindable(null),
    onactivexchange,
    onselect,
    label = "Time series",
    variant = "line",
    curve = "smooth",
    presentation = "full",
    layout = "roomy",
    readout = "auto",
    size,
    hiddenSeries = $bindable([]),
    onhiddenserieschange,
    format = (value: number) => formatChartNumber(value),
    formatX,
    valueDomain,
    interactive,
    strokeWidth = 2, series = 1, color, palette,
    width,
    height,
    loading = "lazy",
    class: className = "",
  }: Props = $props();

  const FALLBACK_WIDTH = 640;
  let box = $state<DOMRectReadOnly>();
  let plotBox = $state<DOMRectReadOnly>();
  let rhythm = $state(COMFORTABLE_CHART_RHYTHM);
  let probe: HTMLElement;
  let figure = $state<HTMLElement>();
  const chart = lazyChart(timeSeriesEngine, () => figure, () => loading);
  onMount(() => observeChartRhythm(probe, (next) => (rhythm = next)));
  const datasets = $derived(timeSeriesDatasets(data, label, series, palette));
  const explores = $derived(interactive ?? (data.length > 0 && "data" in data[0]!));
  const legacyRows = $derived(explores ? 6 : 10);
  const ROWS = $derived(chartRows(layout, legacyRows, size));
  let keyboard = $state(false);
  const visible = $derived(datasets.filter((dataset) => !hiddenSeries.includes(dataset.id)));
  const points = $derived(datasets.flatMap((dataset) => dataset.data));
  const viewport = $derived(chartTimeRange(timeRange));
  const allSamples = $derived(timeSeriesSamples(datasets));
  const samples = $derived(viewport ? allSamples.filter(sample => +sample >= viewport[0] && +sample <= viewport[1]) : allSamples);
  const bars = $derived(timeSeriesBars(datasets));
  const domain = $derived.by(() => {
    if (viewport) return viewport;
    const domain = timeSeriesDomain(allSamples);
    if (variant !== "bar") return domain;
    let low = Infinity, high = -Infinity;
    for (const series of bars) for (const bar of series.data) { low = Math.min(low, bar.x); high = Math.max(high, bar.x1); }
    return Number.isFinite(low) ? [low, high] as [number, number] : domain;
  });
  const fixedValues = $derived(timeSeriesValueDomain(valueDomain, variant !== "line"));
  const barDomain = $derived.by(() => {
    let low = 0, high = 0;
    for (const series of bars) for (const bar of series.data) { low = Math.min(low, bar.y, bar.y1); high = Math.max(high, bar.y, bar.y1); }
    return [low, high === low ? low + 1 : high] as [number, number];
  });
  const index = $derived(chartTimeIndex(samples, activeX, sample => +sample));
  const sample = $derived(samples[index]);
  const sampleLabel = $derived(sample === undefined ? "No samples" : (formatX ?? formatTimeSample)(sample));
  const readings = $derived(visible.map((dataset) => ({
    ...dataset, value: dataset.samples.get(+(sample ?? NaN)),
  })));
  const announcement = $derived(`${sampleLabel}. ${readings.map((reading) => `${reading.label}: ${reading.value === undefined ? "No sample" : format(reading.value)}`).join(", ")}`);

  function inspect(value: number | null): void { activeX = value; onactivexchange?.(value); }

  function toggle(id: string): void {
    hiddenSeries = hiddenSeries.includes(id) ? hiddenSeries.filter((value) => value !== id) : [...hiddenSeries, id];
    onhiddenserieschange?.(hiddenSeries);
  }

  function explorePointer(event: PointerEvent, commit = false): void {
    if (!explores || samples.length === 0) return;
    keyboard = false;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - box.left - padding.left) / Math.max(1, drawingWidth - padding.left - padding.right)));
    const value = +(samples[nearestTimeIndex(samples, domain[0] + fraction * (domain[1] - domain[0]))]!);
    inspect(value);
    if (commit) onselect?.(value);
  }

  function exploreKey(event: KeyboardEvent): void {
    if (!explores || samples.length === 0) return;
    if (event.key === "Escape") { inspect(null); return; }
    if (onselect && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onselect(+samples[index]!); return; }
    const next = event.key === "Home" ? 0 : event.key === "End" ? samples.length - 1
      : ["ArrowRight", "ArrowUp"].includes(event.key) ? index + 1
      : ["ArrowLeft", "ArrowDown"].includes(event.key) ? index - 1 : undefined;
    if (next === undefined) return;
    event.preventDefault();
    keyboard = true;
    inspect(+samples[Math.max(0, Math.min(samples.length - 1, next))]!);
  }

  const drawingWidth = $derived(
    width ?? (box && box.width > 0 ? Math.floor(box.width) : FALLBACK_WIDTH),
  );
  const drawingHeight = $derived(Math.max(1, plotBox?.height ? Math.floor(plotBox.height) : typeof height === "number" ? height : Math.round(rhythm.row * ROWS)));
  // An area measures from zero, so its scale always holds zero; a line keeps
  // the data's own range, where a change is what it shows.
  const baseline = $derived(variant !== "line" ? 0 : undefined);
  const extremes = $derived.by(() => {
    let low = baseline ?? Infinity;
    let high = baseline ?? -Infinity;
    for (const point of points) {
      if (!Number.isFinite(point.y)) continue;
      low = Math.min(low, point.y);
      high = Math.max(high, point.y);
    }
    return Number.isFinite(low) ? [low, high] : [];
  });
  const padding = $derived(timeSeriesPadding(samples, domain, (fixedValues ?? (variant === "bar" || variant === "stacked-area" ? barDomain : extremes)).map(value => format(value)), formatX, rhythm.inset, presentation === "minimal"));

</script>

<figure
  bind:this={figure}
  data-ds-chart
  aria-busy={!chart.Engine || undefined}
  data-chart-loaded={chart.Engine ? "" : undefined}
  data-chart-kind="time-series"
  data-chart-variant={variant}
  data-chart-inspecting={chartCursor(activeX, domain) !== undefined ? "" : undefined}
  data-chart-presentation={presentation}
  data-chart-layout={layout}
  data-chart-readout={readout}
  data-chart-series={series}
  data-chart-width={width === undefined ? "fluid" : "fixed"}
  bind:contentRect={box}
  role={explores ? "group" : "img"}
  aria-label={label}
  style:--color-primary={tokenColor(color, `var(--reddb-color-series-${series})`)}
  class={chartFigure({ series, fluid: width === undefined, class: `w-full overflow-hidden rounded-lg ${chartSurface({ fill: height === "fill" })} ${className}` })}
>
  <span
    bind:this={probe}
    data-chart-rhythm-probe
    aria-hidden="true"
    class="pointer-events-none invisible absolute start-0 top-0 h-[var(--reddb-spatial-control-height-md)] w-[var(--reddb-spatial-inset-sm)]"
  ></span>
  <!-- The conditional slider has a tab stop only while it exposes sample bounds and keyboard interaction. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    data-chart-explorer
    bind:contentRect={plotBox}
    style:height={chartHeightStyle(layout, legacyRows, size, height)}
    role={explores ? "slider" : undefined}
    tabindex={explores && samples.length > 0 ? 0 : undefined}
    aria-label={explores ? `Explore ${label}` : undefined}
    aria-orientation={explores ? "horizontal" : undefined}
    aria-valuemin={explores ? 0 : undefined}
    aria-valuemax={explores ? Math.max(0, samples.length - 1) : undefined}
    aria-valuenow={explores ? index : undefined}
    aria-valuetext={explores ? announcement : undefined}
    class={`relative min-h-0 shrink-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${height === "fill" ? "flex-1" : chartAdaptiveHeight(layout, legacyRows, size, height)}`}
    onpointermove={(event) => explorePointer(event)}
    onpointerdown={(event) => explorePointer(event, true)}
    onkeydown={exploreKey}
    onblur={() => (keyboard = false)}
  >
    {#if chart.Engine}
      {@const Engine = chart.Engine}
      <Engine {strokeWidth} data={points} datasets={visible} {variant} {curve} {presentation} {format} {formatX} {baseline} {domain} {samples} valueDomain={fixedValues} {barDomain} cursor={explores ? chartCursor(activeX, domain) : undefined} width={drawingWidth} height={drawingHeight} {padding} />
    {:else}
    <!-- The drawing's own height before it exists: `height`, or ROWS of the
         Density's control height — the length the probe reads once mounted —
         so the swap to the engine moves nothing (CLS 0) at every stop. -->
    <div
      data-chart-placeholder
      aria-hidden="true"
      class="h-full w-full"
    ><Skeleton shape={variant === "bar" ? "column" : variant === "line" ? "line" : "area"} class="h-full max-w-none" /></div>
    {/if}
  </div>
  {#if explores}
    <div data-chart-legend aria-label={`${label} series`} class="flex flex-wrap gap-[var(--reddb-spatial-gap-sm)]">
      {#each datasets as dataset (dataset.id)}
        <button type="button" aria-pressed={!hiddenSeries.includes(dataset.id)} data-chart-legend-item={dataset.id}
          class={quietControl({ ink: "foreground", class: "inline-flex min-h-[var(--reddb-spatial-control-height-sm)] items-center gap-[var(--reddb-spatial-gap-sm)] rounded-md px-[var(--reddb-spatial-gap-sm)] aria-[pressed=false]:text-ink-muted" })}
          onclick={() => toggle(dataset.id)}>
          <span aria-hidden="true" class={`size-[var(--reddb-spatial-gap-md)] rounded-full border border-current ${hiddenSeries.includes(dataset.id) ? "bg-transparent" : "bg-current"}`} style:color={dataset.paint}></span>
          <span class="text-caption">{dataset.label}</span>
        </button>
      {/each}
    </div>
    <div data-chart-tooltip aria-live={keyboard ? "polite" : "off"} class={readout === "hidden" ? "sr-only" : `flex shrink-0 min-h-[var(--reddb-spatial-control-height-md)] flex-wrap items-center gap-x-[var(--reddb-spatial-layout-gap-sm)] gap-y-[var(--reddb-spatial-gap-sm)] text-caption text-ink-muted tabular-nums ${chartReadout(layout, readout)}`}>
      <span data-chart-sample>{sampleLabel}</span>
      {#each readings as reading (reading.id)}
        <span data-chart-reading={reading.id}>{reading.label} <strong class="font-medium text-foreground">{reading.value === undefined ? "No sample" : format(reading.value)}</strong></span>
      {/each}
      {#if visible.length === 0}<span>All series hidden. Use the legend to restore them.</span>{/if}
    </div>
  {/if}
</figure>
