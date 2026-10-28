<script lang="ts">
  import type { Snippet } from "svelte";
  import { circularFocus, circularModel, type PieSlice, type DonutReading } from "../core/circular-chart";
  import type { ChartPalette } from "../core/chart-color";
  import Canvas from "./ChartCanvas.svelte";
  import Mark from "./VisualizationMark.svelte";
  import { RadialContent } from "@reddb-io/design-system/base";
  let { data, label, thickness, selected, palette, labels, format, height, center, onselect }: {
    data: readonly PieSlice[]; label: string; thickness?: number; selected?: string | null; palette?: ChartPalette;
    labels: "none" | "value" | "percent"; format: (value: number) => string; height: string;
    center?: Snippet<[DonutReading]>; onselect?: (id: string) => void;
  } = $props();
  let width = $state(640), measuredHeight = $state(320);
  const model = $derived(circularModel(data, thickness, selected, palette));
  const diameter = $derived(Math.max(1, Math.min(width, measuredHeight) - 16));
  const centerSize = $derived(diameter * (1 - (thickness ?? 1)) * 0.9);
</script>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Delegated arrow-key navigation between focusable SVG marks.) -->
<div role="group" aria-label={`${label} slices`} onkeydown={circularFocus} data-circular-plot class="relative grid min-h-0 min-w-0 flex-1 place-items-center" style:height bind:clientWidth={width} bind:clientHeight={measuredHeight}>
  <Canvas {width} height={measuredHeight} {label}>
    {#each model.slices.filter(slice => slice.path) as slice (slice.id)}
      <Mark id={slice.id} label={`${slice.label}: ${format(slice.value)} (${(slice.fraction * 100).toFixed(1)}%)`} selected={selected ?? ""} {onselect}>
        <path data-slice={slice.id} d={slice.path} transform={`translate(${width / 2} ${measuredHeight / 2}) scale(${diameter / 200})`} fill={slice.paint} stroke={selected === slice.id ? "var(--reddb-color-foreground)" : "var(--reddb-color-background)"} stroke-width={selected === slice.id ? 2 : 1} />
      </Mark>
      {#if labels !== "none" && slice.fraction >= 0.08 && diameter >= 160}
        <text x={width / 2 + slice.centroid[0] * diameter / 200} y={measuredHeight / 2 + slice.centroid[1] * diameter / 200} text-anchor="middle" dominant-baseline="middle" fill="var(--reddb-color-foreground)" stroke="var(--reddb-color-background)" stroke-width="3" paint-order="stroke" class="pointer-events-none text-caption">{labels === "percent" ? `${(slice.fraction * 100).toFixed(0)}%` : format(slice.value)}</text>
      {/if}
    {/each}
  </Canvas>
  {#if thickness !== undefined}
    <div data-donut-center class="pointer-events-none absolute grid place-items-center overflow-hidden" style:width={`${centerSize}px`} style:height={`${centerSize}px`}>
      {#if center}{@render center(model.reading)}{:else}<RadialContent title={model.reading.total ? model.reading.selected?.label ?? "Total" : "No contributions"} value={format(model.reading.value)} />{/if}
    </div>
  {/if}
  {#if !model.reading.total && thickness === undefined}<span data-circular-empty class="absolute text-caption text-ink-muted">No contributions</span>{/if}
</div>
