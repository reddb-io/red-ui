<script module lang="ts">export type { BarCategory, BarSeries } from "./core/bar-chart";</script>
<script lang="ts">
  import type { Snippet } from "svelte";
  import { formatChartNumber } from "./chart";
  import CompositeChart from "./CompositeChart.svelte";
  import { barModel, type BarCategory } from "./core/bar-chart";
  import type { BarChartContract } from "./core/contracts/barchart";
  interface Props extends BarChartContract {
    /** Optional noninteractive category identity, such as an avatar and name, displayed below the plot. */
    category?: Snippet<[BarCategory]>;
    /** Reports series visibility changes. */
    onhiddenserieschange?: (ids: readonly string[]) => void;
    /** Reports opening or dismissing the maximized plot. */
    onexpandedchange?: (expanded: boolean) => void;
    /** Reports linked sample inspection. */
    onactivexchange?: (value: number | null) => void;
    /** Extra classes on the chart. */
    class?: string;
  }
  let { data, series, sort = "input", category, hiddenSeries = $bindable([]), expanded = $bindable(false), activeX = $bindable(null), ...rest }: Props = $props();
  const model = $derived(barModel(data, series, sort, rest.palette));
</script>
<CompositeChart {...rest} data={model.layers} formatX={model.formatX} bind:hiddenSeries bind:expanded bind:activeX />
{#if category}<div aria-label={`${rest.label} categories`} class="flex min-w-0 flex-wrap gap-[var(--reddb-spatial-gap-md)]">{#each model.categories as item (item.id)}<div class="min-w-0">{@render category(item)}</div>{/each}</div>{/if}

<details class="text-caption"><summary class="min-h-[var(--reddb-spatial-control-height-sm)] content-center focus-visible:outline-2 focus-visible:outline-focus">Explore data ({model.categories.length})</summary>
  <div class="min-w-0 overflow-x-auto"><table class="w-full text-start"><caption class="sr-only">{rest.label} data</caption><thead><tr><th scope="col">Category</th>{#if series?.length}{#each series as item (item.id)}<th scope="col">{item.label}</th>{/each}{:else}<th scope="col">Value</th>{/if}</tr></thead><tbody>{#each model.categories as item (item.id)}<tr><th scope="row">{item.label}</th>{#if series?.length}{#each series as contribution (contribution.id)}<td>{item.values?.[contribution.id] == null ? "No sample" : (rest.primaryAxis?.format ?? formatChartNumber)(item.values[contribution.id]!)}</td>{/each}{:else}<td>{item.value == null ? "No sample" : (rest.primaryAxis?.format ?? formatChartNumber)(item.value)}</td>{/if}</tr>{/each}</tbody></table></div>
</details>
