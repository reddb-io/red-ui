<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Skeleton, quietControl } from "@reddb-io/design-system/base";
  import { COMFORTABLE_CHART_RHYTHM, observeChartRhythm, type ChartSize, type ChartHeight, type ChartLayout, type ChartReadout, type ChartTimestamp } from "../chart";
  import { chartSurface, chartReadout, chartRows, chartHeightStyle, chartAdaptiveHeight } from "../chart-layout.variants";
  import { chartTimeIndex, chartCursor } from "../core/chart-time";
  import { compositeChart } from "../composite-chart.variants";
  import { compositeLayout, compositeNearest, compositeKey, compositeInspection, type CompositeModel, type CompositeAxis, type CompositeX } from "../core/composite-chart";
  import { compositeChartEngine } from "../chart-engines";
  import { lazyChart } from "../chart-loader.svelte";
  import { compositeSkeletonShape } from "../core/chart-skeleton";
  import type { ChartLoading } from "../chart-loading";
  interface Props {
    model: CompositeModel;
    layoutMode: ChartLayout;
    readoutMode: ChartReadout;
    label: string;
    orientation: "vertical" | "horizontal";
    primaryAxis?: CompositeAxis;
    secondaryAxis?: CompositeAxis;
    formatX?: (value: CompositeX) => string;
    presentation: "full" | "minimal";
    legend: "compact" | "hidden";
    interactive: boolean;
    hiddenSeries: readonly string[];
    activeX?: ChartTimestamp | null;
    onactivechange: (timestamp: number | null) => void;
    ontoggle: (id: string) => void;
    size?: ChartSize;
    height?: ChartHeight;
    fill?: boolean;
    loading: ChartLoading;
    actions?: Snippet;
  }
  const { model, label, layoutMode, readoutMode, orientation, primaryAxis, secondaryAxis, formatX, presentation, legend, interactive, hiddenSeries, activeX, onactivechange, ontoggle, size, height, fill = false, loading, actions }: Props = $props();
  const styles = compositeChart();
  const uid = $props.id();
  let figure = $state<HTMLElement>();
  let box = $state<DOMRectReadOnly>();
  let probe: HTMLElement;
  let rhythm = $state(COMFORTABLE_CHART_RHYTHM);
  let keyboard = $state(false);
  const chart = lazyChart(compositeChartEngine, () => figure, () => loading);
  onMount(() => observeChartRhythm(probe, next => rhythm = next));
  const fills = $derived(fill || height === "fill");
  const drawingWidth = $derived(Math.max(1, box?.width ? Math.floor(box.width) : 640));
  const drawingHeight = $derived(Math.max(1, box?.height ? Math.floor(box.height) : typeof height === "number" ? height : rhythm.row * chartRows(layoutMode, 10, size)));
  const layout = $derived(compositeLayout(model, drawingWidth, drawingHeight, orientation === "horizontal", presentation, primaryAxis, secondaryAxis, formatX));
  const inspection = $derived(compositeInspection(model, hiddenSeries, chartTimeIndex(model.samples, activeX, sample => sample.key), primaryAxis, secondaryAxis, formatX, legend === "compact"));
  function pointer(event: PointerEvent): void {
    if (!interactive || !model.samples.length) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const horizontal = orientation === "horizontal";
    const position = horizontal ? event.clientY - rect.top - layout.padding.top : event.clientX - rect.left - layout.padding.left;
    const fraction = Math.max(0, Math.min(1, position / (horizontal ? layout.plotHeight : layout.plotWidth)));
    keyboard = false;
    onactivechange(model.samples[compositeNearest(model.samples, model.sampleDomain[0] + fraction * (model.sampleDomain[1] - model.sampleDomain[0]))]!.key);
  }
  function key(event: KeyboardEvent): void {
    if (!interactive) return;
    if (event.key === "Escape") { onactivechange(null); return; }
    const next = compositeKey(event.key, inspection.index, model.samples.length);
    if (next === undefined) return;
    event.preventDefault(); keyboard = true; onactivechange(model.samples[next]!.key);
  }
</script>

<figure bind:this={figure} data-ds-chart data-chart-kind="composite-chart" data-chart-orientation={orientation}
  data-chart-inspecting={chartCursor(activeX, model.sampleDomain) !== undefined ? "" : undefined} data-chart-presentation={presentation} data-chart-layout={layoutMode} data-chart-readout={readoutMode} aria-busy={!chart.Engine || undefined} data-chart-loaded={chart.Engine ? "" : undefined}
  role="group" aria-label={label}
  aria-describedby={model.references.length ? `${uid}-references` : undefined}
  class={`${styles.panel()} ${chartSurface({ fill: fills })}`}>
  <span id={`${uid}-references`} class="sr-only">References: {model.references.map(reference => reference.label).join(", ")}</span>
  <span id={`${uid}-help`} class="sr-only">Use arrow keys to inspect samples. Home and End select the first and last sample.</span>
  <span bind:this={probe} aria-hidden="true" class="pointer-events-none invisible absolute start-0 top-0 h-[var(--reddb-spatial-control-height-md)] w-[var(--reddb-spatial-inset-sm)]"></span>
  {#if legend === "compact" || actions || primaryAxis || secondaryAxis}
    <div class={styles.toolbar()}>
      {#if legend === "compact"}
        <div data-chart-legend aria-label={`${label} series`} class={styles.legend()}>
          {#each model.series as series (series.id)}
            <button type="button" data-chart-legend-item={series.id} aria-pressed={!hiddenSeries.includes(series.id)}
              class={quietControl({ ink: "foreground", class: styles.legendItem() })} onclick={() => ontoggle(series.id)}>
              <svg aria-hidden="true" viewBox="0 0 16 12" class={`${styles.swatch()} h-[1em]`}>
                {#if series.kind === "candlestick"}<path d="M8 0V12M4 3H12V9H4Z" stroke={series.paint} fill="none" />
                {:else if series.kind === "column"}<rect x="3" y="2" width="10" height="8" fill={series.paint} />
                {:else}<line x1="0" x2="16" y1="6" y2="6" stroke={series.paint} stroke-width="2" stroke-dasharray={series.dash} />{/if}
              </svg>
              <span>{series.label}</span>
            </button>
          {/each}
        </div>
      {/if}
      <div data-chart-axis-key class={styles.axes()}>
        {#if primaryAxis}{primaryAxis.label} ({orientation === "vertical" ? "left" : "bottom"}){/if}
        {#if secondaryAxis}{primaryAxis ? " · " : ""}{secondaryAxis.label} ({orientation === "vertical" ? "right" : "top"}){/if}
      </div>
      {#if actions}{@render actions()}{/if}
    </div>
  {/if}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div bind:contentRect={box} data-chart-explorer class={`${styles.plot()} ${fills ? "flex-1" : chartAdaptiveHeight(layoutMode, 10, size, height)}`}
    style:height={fills ? undefined : chartHeightStyle(layoutMode, 10, size, height)}
    role={interactive ? "slider" : undefined} tabindex={interactive && model.samples.length ? 0 : undefined}
    aria-label={interactive ? `Explore ${label}` : undefined} aria-orientation={interactive ? (orientation === "horizontal" ? "vertical" : "horizontal") : undefined}
    aria-describedby={interactive ? `${uid}-help` : undefined}
    aria-valuemin={interactive ? 0 : undefined} aria-valuemax={interactive ? Math.max(0, model.samples.length - 1) : undefined}
    aria-valuenow={interactive ? inspection.index : undefined} aria-valuetext={interactive ? inspection.announcement : undefined}
    onpointermove={pointer} onpointerdown={pointer} onkeydown={key} onblur={() => keyboard = false}>
    {#if chart.Engine}
      {@const Engine = chart.Engine}
      <Engine {model} {layout} {hiddenSeries} {presentation} cursor={interactive ? chartCursor(activeX, model.sampleDomain) : undefined} />
    {:else}<div data-chart-placeholder aria-hidden="true" class="h-full w-full"><Skeleton shape={compositeSkeletonShape(model, orientation)} class="h-full max-w-none" /></div>{/if}
    {#if inspection.empty}<div data-composite-empty class={styles.empty()}>{inspection.empty}</div>{/if}
  </div>
  {#if interactive}
    <div data-chart-tooltip aria-live={keyboard ? "polite" : "off"} class={readoutMode === "hidden" ? "sr-only" : `${styles.readout()} ${chartReadout(layoutMode, readoutMode)}`}>
      <span data-chart-sample>{inspection.sampleLabel}</span>
      {#each inspection.readings as reading (reading.id)}
        <span data-chart-reading={reading.id}>{reading.label} <strong class="font-medium text-foreground">{reading.value}</strong></span>
      {/each}
    </div>
  {/if}
</figure>
