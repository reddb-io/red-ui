<script module lang="ts">export type { PieSlice, DonutReading } from "./core/circular-chart";</script>
<script lang="ts">
  import type { Snippet } from "svelte";
  import { Button, Dialog, quietControl } from "@reddb-io/design-system/base";
  import type { DonutReading } from "./core/circular-chart";
  import { circularModel } from "./core/circular-chart";
  import { number } from "./visualization";
  import { compositeChart } from "./composite-chart.variants";
  import { circularChart } from "./circular-chart.variants";
  import { chartHeightStyle } from "./chart-layout.variants";
  import Plot from "./internal/CircularPlot.svelte";
  import type { PieChartContract } from "./core/contracts/piechart";
  interface Props extends PieChartContract {
    /** Reports slice selection or clearing to the application. */
    onselectedchange?: (id: string | null) => void;
    /** Reports opening or dismissing the expanded view. */
    onexpandedchange?: (expanded: boolean) => void;
    /** Extra classes on the figure. */
    class?: string;
  }
  let { data, label, description, palette, selected = $bindable(null), interactive = true, format = number, legend = "compact", labels = "none", layout = "roomy", size, height, expandable = true, expanded = $bindable(false),  onselectedchange, onexpandedchange, class: className }: Props = $props();
  const styles = circularChart();
  const model = $derived(circularModel(data, undefined, selected, palette));
  function choose(id: string) { selected = selected === id ? null : id; onselectedchange?.(selected); }
  function expand() { expanded = true; onexpandedchange?.(true); }
</script>
{#snippet plot(fill = false)}
  <Plot {data} {label} {selected} {palette} {labels} {format}  height={fill ? "100%" : chartHeightStyle(layout, 10, size, height) ?? "100%"} onselect={interactive ? choose : undefined} />
{/snippet}
{#snippet legendContent()}
  {#if legend === "compact"}<div aria-label={`${label} groups`} class={styles.legend()}>
    {#each model.slices as slice (slice.id)}
      <button type="button" disabled={!interactive} aria-pressed={selected === slice.id} data-circular-legend={slice.id} class={quietControl({ ink: "foreground", class: styles.item() })} onclick={() => choose(slice.id)}>
        <span aria-hidden="true" class={styles.swatch()} style:background={slice.paint}></span>{slice.label} <span class="tabular-nums">{format(slice.value)}</span>
      </button>
    {/each}
  </div>{/if}
{/snippet}
<figure data-circular-chart="PieChart" aria-label={label} class={styles.root({ class: `${height === "fill" ? "h-full" : ""} ${className ?? ""}` })}>
  <figcaption class={styles.toolbar()}><div><p class="text-caption font-medium">{label}</p>{#if description}<p class="text-caption text-ink-muted">{description}</p>{/if}</div>{#if expandable && interactive}<Button size="sm" variant="ghost" onclick={expand}>Maximize</Button>{/if}</figcaption>
  {@render plot()}{@render legendContent()}
  <details class="text-caption"><summary>Explore data ({data.length})</summary><table class="w-full text-start"><caption class="sr-only">{label} data</caption><thead><tr><th scope="col">Item</th><th scope="col">Value</th><th scope="col">Share</th></tr></thead><tbody>{#each model.slices as slice (slice.id)}<tr><th scope="row">{slice.label}</th><td>{format(slice.value)}</td><td>{(slice.fraction * 100).toFixed(1)}%</td></tr>{/each}</tbody></table></details>
</figure>
<Dialog title={label} size="xl" bind:open={expanded} onopenchange={onexpandedchange} class={compositeChart().dialog()}>
  {#snippet header({ close })}<div class={compositeChart().header()}><span class="text-caption font-medium">{label}</span><Button size="sm" variant="ghost" onclick={close}>Restore</Button></div>{/snippet}
  {#if expanded}<div class="flex h-full min-h-0 flex-col">{@render plot(true)}{@render legendContent()}</div>{/if}
</Dialog>
