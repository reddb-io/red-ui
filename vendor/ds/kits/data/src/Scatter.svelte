<script module lang="ts">
  export type { VisualizationSize, VisualizationSeries } from "./visualization";
  export type { ScatterPoint } from "./scatter";
  export type { ScatterScale, ScatterRegion } from "./core/scatter-analysis";
</script>
<script lang="ts">
  import type { ScatterContract } from "./core/contracts/scatter";
  import { scatterAnalysis, scatterDrawing, scaleProject } from "./core/scatter-analysis";
  import Frame from "./internal/VisualizationFrame.svelte";
  import Mark from "./internal/VisualizationMark.svelte";
  import Canvas from "./internal/ChartCanvas.svelte";
  import { edge, ink, mutedInk, number } from "./visualization";
  import { tokenColor } from "@reddb-io/design-system/base/recipes";
  interface Props extends ScatterContract {
    /** Reports selection for application-owned filtering or detail navigation. */
    onselectedchange?: (id: string) => void;
    /** Extra classes on the outer figure. */
    class?: string;
  }
  let { data, xDomain, yDomain, trend = false, formatX = number, formatY = number, xScale = "linear", yScale = "linear", pareto, pointLabels = false, highlights = [], palette, strokeWidth = 1.5, xLabel = "", yLabel = "", label = "Scatter", description, width, height, size = "lg", selected = $bindable(""), onselectedchange, interactive = true, detailHref, class: className = "" }: Props = $props();

  const options = $derived({ xScale, yScale, pareto, pointLabels, highlights, palette, strokeWidth });
  const model = $derived(scatterAnalysis(data, options, xDomain, yDomain, trend));
  const rows = $derived(model.points.map(p => ({ ...p, value: `${formatX(p.x)} / ${formatY(p.y)}` })));
  function select(id: string) { selected = id; onselectedchange?.(id); }
</script>
<Frame kind="Scatter" {label} {description} {width} {height} {size} {selected} {detailHref} rows={rows} onselect={interactive ? select : undefined} class={className}>
  {#snippet children({ width: w, height: h })}
    {@const drawing = scatterDrawing(model, options, w, h, formatX, formatY)}
    <Canvas width={w} height={h} {label}>
      {#each drawing.regions as region (region.id)}<rect data-scatter-region={region.id} x={region.x} y={region.y} width={region.width} height={region.height} fill={tokenColor(region.color, edge)}><title>{region.label}</title></rect>{/each}
      {#each drawing.yTicks as tick}<line x1={drawing.left} x2={drawing.right} y1={tick.position} y2={tick.position} stroke={edge}/><text x={drawing.left - 8} y={tick.position} text-anchor="end" dominant-baseline="middle" fill={mutedInk} class="text-xs">{tick.label}</text>{/each}
      {#each drawing.xTicks as tick}<text x={tick.position} y={h - 24} text-anchor="middle" fill={mutedInk} class="text-xs">{tick.label}</text>{/each}
      <text x={drawing.left} y={16} fill={mutedInk} class="text-xs">{yLabel}</text><text x={drawing.right} y={h - 5} text-anchor="end" fill={mutedInk} class="text-xs">{xLabel}</text>

      {#if model.line}<path data-regression d={drawing.path(model.line)} fill="none" stroke={mutedInk} stroke-width={strokeWidth} stroke-dasharray="5 5" />{/if}
      {#if model.frontier.length}<path data-pareto d={drawing.path(model.frontier)} fill="none" stroke={ink} stroke-width={strokeWidth} stroke-dasharray="2 4"><title>Pareto frontier</title></path>{/if}
      {#each drawing.points as p (p.id)}
        <Mark id={p.id} label={`${p.label}: ${formatX(data.find(item => item.id === p.id)!.x)}, ${formatY(data.find(item => item.id === p.id)!.y)}`} {selected} onselect={interactive ? select : undefined}>
          <circle cx={p.x} cy={p.y} r={p.radius ?? 5} fill={p.paint} stroke={selected === p.id ? ink : p.paint} stroke-width={selected === p.id ? 3 : strokeWidth}/>
          {#if p.caption}<text data-point-label={p.id} x={p.caption.x} y={p.caption.y} text-anchor={p.caption.anchor} fill={ink} class="text-xs">{p.caption.text}</text>{/if}
        </Mark>
      {/each}
    </Canvas>
  {/snippet}
</Frame>
