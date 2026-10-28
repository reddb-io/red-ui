<script module lang="ts">
  export type { CandlePoint, CompositeValueSeries, CompositeAxis, CompositeReference } from "./core/composite-chart";
  export type { ChartSeries, ChartSize, ChartLayout, ChartReadout, ChartHeight, ChartTimestamp, ChartTimeRange } from "./chart";
</script>
<script lang="ts">
  import CompositeChart from "./CompositeChart.svelte";
  import type { CandlestickContract } from "./core/contracts/candlestick";
  import type { CompositeChartSeries } from "./core/composite-chart";
  interface Props extends CandlestickContract {
    /** Reports legend visibility changes from either presentation. */
    onhiddenserieschange?: (ids: readonly string[]) => void;
    /** Reports linked inspection as an epoch timestamp, or null to clear it. */
    onactivexchange?: (value: number | null) => void;
    /** Reports maximization and dismissal. */
    onexpandedchange?: (expanded: boolean) => void;
    /** Extra classes on the chart's outer surface. */
    class?: string;
  }
  let { data, label, overlays = [], candleLabel = "OHLC", series = 1,
    hiddenSeries = $bindable([]), expanded = $bindable(false), activeX = $bindable(null), ...rest }: Props = $props();
  const layers = $derived<readonly CompositeChartSeries[]>([{ id: "candles", label: candleLabel, kind: "candlestick", data, series }, ...overlays]);
</script>
<CompositeChart {...rest} {label} data={layers} bind:hiddenSeries bind:expanded bind:activeX />
