<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { Activity, BarChart3, LineChart, X } from 'lucide-svelte'
  import {
    bucketGeometry,
    bucketSeries,
    chartGeometry,
    extractSeries,
    type BucketPoint,
  } from './hypertable-render'

  interface Props {
    result: QueryResult
    collection?: string
    showSystem?: boolean
  }

  let { result, collection }: Props = $props()

  let metric = $state<string | undefined>(undefined)
  let chartMode = $state<'line' | 'rate'>('rate')
  let bucketMs = $state(60_000)
  let selectedBucket = $state<BucketPoint | null>(null)

  const series = $derived(extractSeries(result, metric))
  const lineGeom = $derived(series && chartMode === 'line' ? chartGeometry(series) : null)
  const buckets = $derived(series ? bucketSeries(series, bucketMs) : [])
  const barGeom = $derived(series && chartMode === 'rate' ? bucketGeometry(buckets) : null)

  // ─── filter rows by selected bucket ─────────────────────────────────────
  const visiblePoints = $derived.by(() => {
    if (!series) return []
    if (!selectedBucket) return series.points
    const t0 = selectedBucket.t
    const t1 = t0 + bucketMs
    return series.points.filter((p) => p.t >= t0 && p.t < t1)
  })

  function fmtT(t: number): string {
    try {
      return new Date(t).toISOString().replace('T', ' ').slice(0, 19)
    } catch {
      return String(t)
    }
  }

  function bucketLabel(opt: number): string {
    if (opt === 1000) return '1s'
    if (opt === 10_000) return '10s'
    if (opt === 60_000) return '1min'
    if (opt === 300_000) return '5min'
    if (opt === 3_600_000) return '1hr'
    return `${opt}ms`
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if !series}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No timeseries shape (need a time column and a numeric metric).
    </div>
  {:else}
    <!-- Toolbar -->
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={[
            'inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors',
            chartMode === 'rate' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => (chartMode = 'rate')}
          aria-pressed={chartMode === 'rate'}
        >
          <BarChart3 class="size-3" />
          Writes/{bucketLabel(bucketMs)}
        </button>
        <button
          type="button"
          class={[
            'inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2',
            chartMode === 'line' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0',
          ].join(' ')}
          onclick={() => (chartMode = 'line')}
          aria-pressed={chartMode === 'line'}
        >
          <LineChart class="size-3" />
          Value
        </button>
      </div>

      <label class="inline-flex items-center gap-1.5 text-fg-3">
        <Activity class="size-3" />
        metric:
        <select
          class="bg-bg-1 text-fg-1 border border-line-1 rounded px-1.5 py-0.5"
          bind:value={metric}
        >
          {#each series.metrics as m (m)}
            <option value={m}>{m}</option>
          {/each}
        </select>
      </label>

      {#if chartMode === 'rate'}
        <label class="inline-flex items-center gap-1.5 text-fg-3">
          bucket:
          <select
            class="bg-bg-1 text-fg-1 border border-line-1 rounded px-1.5 py-0.5"
            value={bucketMs}
            onchange={(e) => { bucketMs = Number((e.currentTarget as HTMLSelectElement).value); selectedBucket = null }}
          >
            <option value={1000}>1s</option>
            <option value={10_000}>10s</option>
            <option value={60_000}>1min</option>
            <option value={300_000}>5min</option>
            <option value={3_600_000}>1hr</option>
          </select>
        </label>
      {/if}

      {#if selectedBucket}
        <button
          type="button"
          onclick={() => (selectedBucket = null)}
          class="inline-flex items-center gap-1 px-2 py-1 rounded border border-line-1 text-fg-3 hover:text-fg-1 cursor-pointer"
          title="Show all rows again"
        >
          <X class="size-3" />
          clear bucket
        </button>
      {/if}

      <div class="ml-auto text-fg-3">
        {visiblePoints.length.toLocaleString()}{#if selectedBucket} of {series.points.length.toLocaleString()}{/if} pts
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </div>
    </div>

    <!-- Chart -->
    <div class="px-3 pt-2">
      {#if chartMode === 'rate' && barGeom}
        <svg
          viewBox={`0 0 ${barGeom.width} ${barGeom.height}`}
          class="block w-full h-[180px]"
          aria-label="Writes per bucket"
        >
          {#each barGeom.bars as bar (bar.bucket.t)}
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.w}
              height={bar.h}
              class="cursor-pointer transition-opacity"
              fill="var(--color-accent)"
              opacity={!selectedBucket || selectedBucket.t === bar.bucket.t ? 0.9 : 0.3}
              role="button"
              tabindex="0"
              aria-label="Bucket starting at {fmtT(bar.bucket.t)} with {bar.bucket.count} writes"
              onclick={() => (selectedBucket = selectedBucket?.t === bar.bucket.t ? null : bar.bucket)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedBucket = selectedBucket?.t === bar.bucket.t ? null : bar.bucket } }}
            >
              <title>{fmtT(bar.bucket.t)} — {bar.bucket.count} writes (sum {bar.bucket.sum.toFixed(2)})</title>
            </rect>
          {/each}
          <text x={barGeom.padding} y={barGeom.height - 2} class="text-[9px] fill-fg-3 font-mono">
            {fmtT(barGeom.bars[0]?.bucket.t ?? 0)}
          </text>
          <text x={barGeom.width - barGeom.padding} y={barGeom.height - 2} text-anchor="end" class="text-[9px] fill-fg-3 font-mono">
            peak {barGeom.maxCount}/{bucketLabel(bucketMs)}
          </text>
        </svg>
      {:else if lineGeom}
        <svg
          viewBox={`0 0 ${lineGeom.width} ${lineGeom.height}`}
          class="block w-full h-[180px] text-accent"
          aria-label="Timeseries chart"
        >
          <path d={lineGeom.path} fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      {/if}
    </div>

    <!-- Rows -->
    <div class="flex-1 min-h-0 overflow-auto">
      <table class="w-full border-collapse text-[12px] font-mono">
        <thead class="sticky top-0 bg-bg-1 z-10">
          <tr class="border-b border-line-1 text-fg-3">
            <th class="px-2 py-1.5 text-left font-normal">{series.timeColumn}</th>
            <th class="px-2 py-1.5 text-right font-normal">{series.metricColumn}</th>
          </tr>
        </thead>
        <tbody>
          {#each visiblePoints as p, i (i)}
            <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
              <td class="px-2 py-1">{fmtT(p.t)}</td>
              <td class="px-2 py-1 text-right">{p.v}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3">
      {visiblePoints.length} points{collection ? ' · ' : ''}{collection ?? ''}
      {#if selectedBucket}· bucket {fmtT(selectedBucket.t)} (+{bucketLabel(bucketMs)}){/if}
    </div>
  {/if}
</div>
