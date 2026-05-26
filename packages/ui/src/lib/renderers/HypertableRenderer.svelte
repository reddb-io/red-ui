<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import {
    CHART_HEIGHT,
    CHART_WIDTH,
    chartGeometry,
    extractSeries,
  } from './hypertable-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()
  let metric = $state<string | undefined>(undefined)

  const series = $derived(extractSeries(result, metric))
  const geom = $derived(series ? chartGeometry(series) : null)

  function fmtT(t: number): string {
    try {
      return new Date(t).toISOString().replace('T', ' ').slice(0, 19)
    } catch {
      return String(t)
    }
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if !series}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No timeseries shape (need a time column and a numeric metric).
    </div>
  {:else}
    <div class="flex items-center gap-2 border-b border-line-1 px-3 py-1.5 text-[12px] font-mono">
      <span class="text-fg-3">metric:</span>
      <select
        class="bg-bg-1 text-fg-1 border border-line-1 rounded px-1.5 py-0.5"
        bind:value={metric}
      >
        {#each series.metrics as m (m)}
          <option value={m}>{m}</option>
        {/each}
      </select>
      <span class="ml-auto text-fg-3">{series.points.length} pts</span>
    </div>
    <div class="px-3 pt-2">
      {#if geom}
        <svg
          viewBox={`0 0 ${geom.width} ${geom.height}`}
          class="block w-full h-[180px] text-accent"
          aria-label="Timeseries chart"
        >
          <path d={geom.path} fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      {/if}
    </div>
    <div class="flex-1 min-h-0 overflow-auto">
      <table class="w-full border-collapse text-[12px] font-mono">
        <thead class="sticky top-0 bg-bg-1 z-10">
          <tr class="border-b border-line-1 text-fg-3">
            <th class="px-2 py-1.5 text-left font-normal">{series.timeColumn}</th>
            <th class="px-2 py-1.5 text-right font-normal">{series.metricColumn}</th>
          </tr>
        </thead>
        <tbody>
          {#each series.points as p (p.t)}
            <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
              <td class="px-2 py-1">{fmtT(p.t)}</td>
              <td class="px-2 py-1 text-right">{p.v}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3">
      {series.points.length} points{collection ? ' · ' : ''}{collection ?? ''}
    </div>
  {/if}
</div>
