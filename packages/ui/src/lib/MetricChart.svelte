<script lang="ts">
  import { EmptyState, Progress } from '@reddb-io/design-system/base'
  import KpiCard from '@reddb-io/design-system/data/KpiCard'
  import TimeSeries, { type TimeSeriesDataset } from '@reddb-io/design-system/data/TimeSeries'
  import type { ChartKind, NormalizedSeries } from '#reddb'
  let { chart, series, unit = null }: { chart: ChartKind; series: NormalizedSeries[]; unit?: string | null } = $props()
  const colors = {
    p50: '--reddb-color-feedback-success-foreground',
    p95: '--reddb-color-feedback-warning-foreground',
    p99: '--reddb-color-feedback-danger-foreground',
  } as const
  const data = $derived<TimeSeriesDataset[]>(series.map((item, index) => ({
    id: `${index}:${item.label}`, label: item.label,
    color: colors[item.label as keyof typeof colors],
    data: item.points.map(point => ({ x: new Date(point.t), y: point.v })),
  })))
  const hasData = $derived(series.some(item => item.points.length > 0))
  const latest = $derived(series[0]?.points.at(-1)?.v ?? null)
  const ratio = $derived(chart === 'gauge' && latest !== null && latest >= 0 && latest <= 1)
  const label = $derived(series.map(item => item.label).join(', ') || 'Metric')
  function format(value: number): string {
    if (ratio) return `${(value * 100).toFixed(1)}%`
    return `${value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(value) < 1 ? 3 : 2 })}${unit ? ` ${unit}` : ''}`
  }
</script>

{#if !hasData}
  <EmptyState title="No samples in this window" description="Choose a different time range or wait for new observations." bordered={false} />
{:else if chart === 'gauge'}
  <KpiCard {label} value={latest === null ? '—' : format(latest)} />
  {#if ratio && latest !== null}<Progress label={`${label} level`} value={latest * 100} />{/if}
{:else}
  <TimeSeries {label} {data} variant={chart === 'area' ? 'area' : 'line'} curve="linear" layout="auto" interactive {format} />
{/if}
