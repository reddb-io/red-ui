<script lang="ts">
  import type { QueryResult } from '#reddb'
  import KpiCard from '@reddb-io/design-system/data/KpiCard'
  import Table, { type TableColumn } from '@reddb-io/design-system/data/Table'
  import Gauge from '@lucide/svelte/icons/gauge'
  import List from '@lucide/svelte/icons/list'
  import Table2 from '@lucide/svelte/icons/table-2'
  import { extractStats, formatMetric } from './stats-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  let mode = $state<'kpi' | 'gauge' | 'table'>('kpi')
  const metrics = $derived(extractStats(result))
  const columns: TableColumn[] = [
    { key: 'label', header: 'metric' },
    { key: 'value', header: 'value', align: 'end' },
    { key: 'unit', header: 'unit' },
  ]
  const tableRows = $derived(metrics.map((metric, index) => ({
    id: index, label: metric.label, value: metric.value.toLocaleString(), unit: metric.unit || '-',
  })))
  const max = $derived(Math.max(1, ...metrics.map((m) => Math.abs(m.value))))

  function percent(value: number): number {
    if (value >= 0 && value <= 100) return value
    return Math.min(100, Math.abs(value) / max * 100)
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if metrics.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No numeric statistics in this result.
    </div>
  {:else}
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors', mode === 'kpi' ? 'bg-primary text-on-primary' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'kpi')}
          aria-pressed={mode === 'kpi'}
        >
          <List class="size-3" />
          kpis
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'gauge' ? 'bg-primary text-on-primary' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'gauge')}
          aria-pressed={mode === 'gauge'}
        >
          <Gauge class="size-3" />
          gauges
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'table' ? 'bg-primary text-on-primary' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'table')}
          aria-pressed={mode === 'table'}
        >
          <Table2 class="size-3" />
          table
        </button>
      </div>
      <div class="ml-auto text-fg-3">
        {metrics.length.toLocaleString()} metrics
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </div>
    </div>

    {#if mode === 'kpi'}
      <div class="flex-1 overflow-auto p-3">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {#each metrics as metric, i (`${metric.key}-${i}`)}
            <KpiCard label={metric.label} value={formatMetric(metric.value, metric.unit)} />
          {/each}
        </div>
      </div>
    {:else if mode === 'gauge'}
      <div class="flex-1 overflow-auto p-3">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
          {#each metrics as metric, i (`${metric.key}-${i}`)}
            {@const p = percent(metric.value)}
            <div class="rounded border border-line-1 bg-bg-1 px-3 py-3 text-center">
              <svg viewBox="0 0 120 70" class="mx-auto h-[82px] w-[150px]" aria-label="{metric.label} gauge">
                <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="var(--color-line-2)" stroke-width="10" stroke-linecap="round" />
                <path
                  d="M 15 60 A 45 45 0 0 1 105 60"
                  fill="none"
                  stroke="var(--color-accent)"
                  stroke-width="10"
                  stroke-linecap="round"
                  pathLength="100"
                  stroke-dasharray={`${p} 100`}
                />
                <text x="60" y="58" text-anchor="middle" class="fill-fg-0 font-mono text-[13px] font-semibold">{formatMetric(metric.value, metric.unit)}</text>
              </svg>
              <div class="mt-1 truncate font-mono text-[11px] text-fg-2">{metric.label}</div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="flex-1 overflow-auto">
        <Table caption={collection ? `${collection} statistics` : 'Statistics'} captionHidden
          {columns} rows={tableRows} rowKey="id" pageSize={Math.max(1, tableRows.length)} columnVisibility={false} />
      </div>
    {/if}
  {/if}
</div>
