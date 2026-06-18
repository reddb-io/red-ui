<script lang="ts">
  // Renders a metric the way its *nature* dictates (eixo 3): the caller passes
  // the ChartKind derived from the descriptor's `kind`, and this component
  // picks the visualisation — a rate line, a filled gauge level, or a
  // P50/P95/P99 percentile curve. No chart-type picker is ever shown to the
  // user; the metric's kind decides.
  import { LineChart, AreaChart } from 'layerchart'
  import type { ChartKind, NormalizedSeries } from '#reddb'

  interface Props {
    chart: ChartKind
    series: NormalizedSeries[]
    unit?: string | null
  }
  let { chart, series, unit = null }: Props = $props()

  // Worse percentiles trend redder; single series leads with the accent.
  const PALETTE = ['#ff2056', '#4ade80', '#fbbf24', '#38bdf8', '#a78bfa']
  const PERCENTILE_COLOR: Record<string, string> = {
    p50: '#4ade80',
    p95: '#fbbf24',
    p99: '#ff2056',
  }

  // LayerChart auto-detects a time scale from Date x-values.
  const chartSeries = $derived(
    series.map((s, i) => ({
      key: s.label,
      color: PERCENTILE_COLOR[s.label] ?? PALETTE[i % PALETTE.length],
      data: s.points.map((p) => ({ date: new Date(p.t), value: p.v })),
    })),
  )

  const hasData = $derived(series.some((s) => s.points.length > 0))

  // Gauge / ratio: lead with the most recent level, big.
  const latest = $derived.by(() => {
    const pts = series[0]?.points
    return pts && pts.length ? pts[pts.length - 1].v : null
  })
  const isRatio = $derived(chart === 'gauge')

  function fmtValue(v: number): string {
    if (isRatio && v >= 0 && v <= 1) return `${(v * 100).toFixed(1)}%`
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 1 })
    return v.toFixed(Math.abs(v) < 1 ? 3 : 2)
  }
</script>

{#if !hasData}
  <div class="flex h-full items-center justify-center text-[12px] text-fg-3 font-mono">
    no samples in window
  </div>
{:else if chart === 'gauge'}
  <!-- Point-in-time level. A ratio shows a 0–100% bar; other gauges show the
       raw latest value. -->
  <div class="flex h-full flex-col items-center justify-center gap-3">
    <div class="font-mono text-[40px] font-semibold leading-none text-accent">
      {latest === null ? '—' : fmtValue(latest)}{#if unit && !isRatio}<span class="ml-1 text-[16px] text-fg-3">{unit}</span>{/if}
    </div>
    {#if isRatio && latest !== null}
      <div class="h-1.5 w-56 overflow-hidden rounded-full bg-bg-3">
        <div class="h-full rounded-full bg-accent" style={`width: ${Math.max(0, Math.min(100, latest * 100))}%`}></div>
      </div>
    {/if}
  </div>
{:else if chart === 'area'}
  <AreaChart
    data={chartSeries[0]?.data ?? []}
    x="date"
    y="value"
    series={chartSeries}
    props={{ area: { 'fill-opacity': 0.12 } }}
    legend={chartSeries.length > 1}
  />
{:else}
  <!-- line + percentiles -->
  <LineChart
    data={chartSeries[0]?.data ?? []}
    x="date"
    y="value"
    series={chartSeries}
    legend={chartSeries.length > 1}
  />
{/if}
