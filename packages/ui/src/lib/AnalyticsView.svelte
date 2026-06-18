<script lang="ts">
  import { Card, Badge } from '@reddb-io/ui-kit'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import MetricChart from '$lib/MetricChart.svelte'
  import { activity } from '$lib/activity.svelte'
  import { connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import {
    promQLForMetric,
    parsePromMatrix,
    type MetricDescriptor,
    type MetricKind,
    type NormalizedSeries,
    type ChartKind,
  } from '#reddb'
  import { LineChart, Lock, RefreshCw } from 'lucide-svelte'

  let metrics = $state<MetricDescriptor[]>([])
  let selectedPath = $state<string | null>(null)
  let series = $state<NormalizedSeries[]>([])
  let chartKind = $state<ChartKind>('line')
  let windowLabel = $state('5m')
  let loading = $state(false)
  let chartLoading = $state(false)
  let catalogError = $state<string | null>(null)
  let seriesError = $state<string | null>(null)

  const activeUrl = $derived(connection.active.url)
  const connected = $derived(connection.connected)
  const selected = $derived(metrics.find((m) => m.path === selectedPath) ?? null)

  // A metric's kind tells the chart what it is — surfaced as a tone so the
  // catalog reads at a glance.
  const KIND_TONE: Record<MetricKind, 'ok' | 'info' | 'warn' | 'accent' | 'neutral'> = {
    counter: 'info',
    gauge: 'ok',
    histogram: 'accent',
    ratio: 'warn',
    derived: 'neutral',
  }

  async function refresh() {
    const client = connection.client
    if (!client || secureStore.locked || !connected) {
      metrics = []
      selectedPath = null
      series = []
      return
    }
    loading = true
    catalogError = null
    try {
      metrics = await activity.track('analytics · catalog', () => client.metricsCatalog())
      if (metrics.length && !metrics.some((m) => m.path === selectedPath)) {
        void selectMetric(metrics[0])
      }
    } catch (e) {
      catalogError = (e as Error).message
      metrics = []
    }
    loading = false
  }

  async function selectMetric(descriptor: MetricDescriptor) {
    selectedPath = descriptor.path
    const client = connection.client
    if (!client) return
    const plan = promQLForMetric(descriptor)
    chartKind = plan.chart
    windowLabel = plan.window
    chartLoading = true
    seriesError = null
    series = []
    // Last hour at 30s resolution — enough to read a trend without flooding.
    const end = Math.floor(Date.now() / 1000)
    const start = end - 3600
    const step = 30
    try {
      const collected: NormalizedSeries[] = []
      for (const q of plan.queries) {
        const resp = await activity.track(`analytics · ${q.label}`, () =>
          client.promQueryRange(q.expr, start, end, step),
        )
        const normalized = parsePromMatrix(resp)
        for (const s of normalized) {
          // For multi-query plans (percentiles) the query label IS the series
          // identity; for single-query plans keep the metric's own labels.
          collected.push(plan.queries.length > 1 ? { ...s, label: q.label } : s)
        }
      }
      // Guard against a metric that exists in the catalog but was never
      // written to a metrics collection (PromQL returns empty).
      if (selectedPath === descriptor.path) series = collected
    } catch (e) {
      seriesError = (e as Error).message
      series = []
    } finally {
      if (selectedPath === descriptor.path) chartLoading = false
    }
  }

  $effect(() => {
    if (secureStore.locked) return
    void activeUrl
    void connected
    refresh()
  })
</script>

<div class="flex h-full flex-col overflow-hidden bg-bg-0 text-fg-1">
  <PageHeader
    eyebrow="Observability"
    title="Analytics"
    subtitle="Metrics chart themselves by nature — a counter is a rate, a histogram is P50/P95/P99, a gauge is a level."
  >
    {#snippet actions()}
      <button
        type="button"
        onclick={refresh}
        disabled={loading || secureStore.locked || !connected}
        class="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[11px] font-mono text-fg-1 hover:border-line-3 hover:text-fg-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw class="size-3.5 {loading ? 'animate-spin' : ''}" />
        refresh
      </button>
    {/snippet}
  </PageHeader>

  {#if secureStore.locked}
    <div class="p-6"><EmptyState icon={Lock} title="Locked" message="Unlock the secure store to read the metric catalog." /></div>
  {:else if !connected}
    <div class="p-6"><EmptyState icon={LineChart} title="Not connected" message="Connect to a reddb instance to browse its metrics." /></div>
  {:else if catalogError}
    <div class="p-6">
      <EmptyState
        icon={LineChart}
        title="No analytics surface"
        message="This reddb didn't answer the metric catalog. Analytics needs a server with the metrics engine (red.metrics)."
        hint={catalogError}
      />
    </div>
  {:else if metrics.length === 0}
    <div class="p-6">
      <EmptyState
        icon={LineChart}
        title="No metrics registered"
        message="Register one with CREATE METRIC, then feed it via Prometheus remote-write or a metrics collection."
        hint="CREATE METRIC http.latency TYPE histogram ROLE sli;"
      />
    </div>
  {:else}
    <div class="grid min-h-0 flex-1 grid-cols-[260px_1fr] overflow-hidden">
      <!-- Catalog -->
      <div class="overflow-auto border-r border-line-1 p-2">
        <div class="grid gap-0.5">
          {#each metrics as m (m.path)}
            <button
              type="button"
              onclick={() => selectMetric(m)}
              class={[
                'flex flex-col gap-1 rounded px-2.5 py-2 text-left transition-colors',
                selectedPath === m.path ? 'bg-bg-2' : 'hover:bg-bg-2',
              ].join(' ')}
            >
              <span class="truncate font-mono text-[12px] text-fg-0">{m.path}</span>
              <span class="flex items-center gap-1.5">
                <Badge tone={KIND_TONE[m.kind] ?? 'neutral'}>{m.kind}</Badge>
                <span class="font-mono text-[10px] text-fg-3">{m.role}</span>
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Chart -->
      <div class="flex min-h-0 flex-col overflow-hidden p-4">
        {#if selected}
          <div class="mb-3 flex items-baseline justify-between">
            <div>
              <div class="font-mono text-[14px] text-fg-0">{selected.path}</div>
              <div class="mt-0.5 text-[11px] text-fg-3">
                {selected.kind} · {chartKind}{#if chartKind !== 'gauge'} · window {windowLabel}{/if}
              </div>
            </div>
            {#if selected.unit}<span class="font-mono text-[11px] text-fg-3">{selected.unit}</span>{/if}
          </div>
          <div class="relative min-h-0 flex-1 rounded border border-line-1 bg-bg-1 p-3">
            {#if chartLoading}
              <div class="flex h-full items-center justify-center font-mono text-[12px] text-fg-3">querying…</div>
            {:else if seriesError}
              <div class="flex h-full items-center justify-center px-6 text-center font-mono text-[12px] text-fg-3">
                {seriesError.includes('404') || seriesError.includes('route not found')
                  ? 'this reddb has no Prometheus query endpoint (/api/v1/query_range)'
                  : seriesError}
              </div>
            {:else}
              <MetricChart chart={chartKind} {series} unit={selected.unit} />
            {/if}
          </div>
        {:else}
          <div class="flex h-full items-center justify-center font-mono text-[12px] text-fg-3">
            select a metric
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
