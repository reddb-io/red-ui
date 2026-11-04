<script module lang="ts">
  export type { ProjectionPoint, ProjectionMetric, ProjectionAnnotation, ProjectionChartContract } from "./projection-chart";
</script>
<script lang="ts">
  import CompositeChart from "./CompositeChart.svelte";
  import { projectionChartModel, type ProjectionChartContract } from "./projection-chart";
  import { projectionChart } from "./projection-chart.variants";
  interface Props extends ProjectionChartContract {
  /** Additional surface classes. */
  class?: string;
  }
  let { label, value, context, metrics = [], recorded, projected, now, valueDomain, annotations = [], nowLabel = "Now", recordedLabel = "Recorded", projectedLabel = "Projected", series = 1, formatValue = String, formatTime = String, class: className = "" }: Props = $props();
  const model = $derived(projectionChartModel({label, value, recorded, projected, now, valueDomain, annotations, nowLabel, recordedLabel, projectedLabel, series}));
  const styles = projectionChart();
</script>
<section data-projection-chart aria-label={label} class={styles.root({class: className})}>
  <div class={styles.header()}>
    <div><p class={styles.label()}>{label}</p><p class={styles.headline()}>{value} {#if context}<span class={styles.context()}>{context}</span>{/if}</p></div>
    <dl class={styles.metrics()}>{#each metrics as metric}<div><dt class={styles.metricLabel()}>{metric.label}</dt><dd class={styles.metricValue()}>{metric.value}</dd></div>{/each}</dl>
  </div>
  <CompositeChart {label} data={model.data} references={model.references} primaryAxis={{label, domain: valueDomain, format: formatValue}} formatX={(x) => formatTime(Number(x))} expandable={false} layout="dense" readout="overlay" size="md" />
  {#if annotations.length}<ul aria-label={`${label} annotations`} class={styles.annotations()}>{#each annotations as annotation (annotation.id)}<li>{annotation.label}: {formatTime(annotation.time)}</li>{/each}</ul>{/if}
</section>
