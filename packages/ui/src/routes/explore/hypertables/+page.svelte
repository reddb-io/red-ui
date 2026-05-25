<script lang="ts">
  import { Badge, Card } from '@red-ui/ui-kit'
  import { hyperSeries } from '$lib/fixtures'

  let metric = $state<'cpu' | 'mem' | 'qps'>('qps')
  let brushStart = $state<number | null>(null)
  let brushEnd = $state<number | null>(null)

  const W = 900
  const H = 280
  const PAD = { t: 20, r: 20, b: 30, l: 50 }

  const values = $derived(hyperSeries.map((p) => p[metric]))
  const min = $derived(Math.min(...values))
  const max = $derived(Math.max(...values))
  const n = $derived(hyperSeries.length)

  function x(i: number) {
    return PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r)
  }
  function y(v: number) {
    return PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b)
  }

  const linePath = $derived(
    hyperSeries.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p[metric])}`).join(' '),
  )
  const areaPath = $derived(
    `${linePath} L ${x(n - 1)} ${H - PAD.b} L ${x(0)} ${H - PAD.b} Z`,
  )

  const filtered = $derived.by(() => {
    if (brushStart === null || brushEnd === null) return hyperSeries
    const [a, b] = [Math.min(brushStart, brushEnd), Math.max(brushStart, brushEnd)]
    return hyperSeries.filter((p) => p.t >= a && p.t <= b)
  })

  const stats = $derived.by(() => {
    const vs = filtered.map((p) => p[metric])
    const avg = vs.reduce((a, b) => a + b, 0) / vs.length
    const sorted = [...vs].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]
    return {
      avg: avg.toFixed(1),
      max: Math.max(...vs).toFixed(1),
      min: Math.min(...vs).toFixed(1),
      p50: p50.toFixed(1),
      p95: p95.toFixed(1),
      p99: p99.toFixed(1),
    }
  })

  let dragging = $state(false)
  function onmousedown(e: MouseEvent) {
    const svg = e.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.max(0, Math.min(n - 1, Math.round(((rel - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1))))
    brushStart = hyperSeries[idx].t
    brushEnd = hyperSeries[idx].t
    dragging = true
  }
  function onmousemove(e: MouseEvent) {
    if (!dragging) return
    const svg = e.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.max(0, Math.min(n - 1, Math.round(((rel - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1))))
    brushEnd = hyperSeries[idx].t
  }
  function onmouseup() { dragging = false }
  function clearBrush() { brushStart = null; brushEnd = null }

  const brushRect = $derived.by(() => {
    if (brushStart === null || brushEnd === null) return null
    const startIdx = hyperSeries.findIndex((p) => p.t === Math.min(brushStart, brushEnd))
    const endIdx = hyperSeries.findIndex((p) => p.t === Math.max(brushStart, brushEnd))
    if (startIdx < 0 || endIdx < 0) return null
    return { x: x(startIdx), w: x(endIdx) - x(startIdx) }
  })

  const metricColor = { cpu: '#fbbf24', mem: '#60a5fa', qps: '#ff2056' }
  const unit = { cpu: '%', mem: '%', qps: '/s' }
</script>

<div class="layout">
  <div class="head">
    <h1>node_metrics <span class="sub">· hypertable · 168 points · 7d window @ 1h</span></h1>
    <div class="metric-switch">
      {#each ['qps', 'cpu', 'mem'] as const as m}
        <button class:active={metric === m} onclick={() => (metric = m)} style="--c: {metricColor[m]}">
          {m}
        </button>
      {/each}
    </div>
  </div>

  <Card>
    <div class="chart-wrap">
      <svg
        viewBox="0 0 {W} {H}"
        width="100%"
        {onmousedown}
        {onmousemove}
        {onmouseup}
        onmouseleave={onmouseup}
        style="cursor: crosshair; user-select: none"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color={metricColor[metric]} stop-opacity="0.35" />
            <stop offset="100%" stop-color={metricColor[metric]} stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- gridlines -->
        {#each [0, 0.25, 0.5, 0.75, 1] as p}
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + p * (H - PAD.t - PAD.b)} y2={PAD.t + p * (H - PAD.t - PAD.b)} stroke="#1a1d22" />
          <text x={PAD.l - 8} y={PAD.t + p * (H - PAD.t - PAD.b) + 3} fill="#4a4f57" font-family="JetBrains Mono" font-size="10" text-anchor="end">
            {(min + (1 - p) * (max - min)).toFixed(0)}{unit[metric]}
          </text>
        {/each}

        <!-- brush -->
        {#if brushRect}
          <rect x={brushRect.x} y={PAD.t} width={brushRect.w} height={H - PAD.t - PAD.b} fill={metricColor[metric]} fill-opacity="0.08" stroke={metricColor[metric]} stroke-opacity="0.4" />
        {/if}

        <!-- area + line -->
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke={metricColor[metric]} stroke-width="1.8" stroke-linejoin="round" />

        <!-- x-axis labels (every 24h) -->
        {#each hyperSeries.filter((_, i) => i % 24 === 0) as p}
          {@const i = hyperSeries.indexOf(p)}
          <text x={x(i)} y={H - 10} fill="#4a4f57" font-family="JetBrains Mono" font-size="10" text-anchor="middle">
            {new Date(p.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        {/each}
      </svg>

      <div class="chart-foot">
        {#if brushStart !== null && brushEnd !== null}
          <span>Selection: {new Date(Math.min(brushStart, brushEnd)).toLocaleString()} → {new Date(Math.max(brushStart, brushEnd)).toLocaleString()}</span>
          <button class="clear" onclick={clearBrush}>clear</button>
        {:else}
          <span>Drag to brush a time window.</span>
        {/if}
      </div>
    </div>
  </Card>

  <div class="stats-grid">
    {#each Object.entries(stats) as [k, v]}
      <Card>
        <div class="stat">
          <div class="s-label">{k}</div>
          <div class="s-value" style="color: {metricColor[metric]}">{v}<span class="s-unit">{unit[metric]}</span></div>
        </div>
      </Card>
    {/each}
  </div>

  <Card title="rows · {filtered.length} of {hyperSeries.length}">
    <div class="rows">
      <div class="r-head">
        <span>timestamp</span><span>cpu</span><span>mem</span><span>qps</span>
      </div>
      {#each filtered.slice(-20).reverse() as p}
        <div class="r">
          <span class="r-t">{new Date(p.t).toLocaleString()}</span>
          <span>{p.cpu.toFixed(1)}%</span>
          <span>{p.mem.toFixed(1)}%</span>
          <span>{p.qps.toFixed(0)}/s</span>
        </div>
      {/each}
    </div>
  </Card>
</div>

<style>
  .layout { display: grid; gap: 12px; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: 18px; margin: 0; font-weight: 600; letter-spacing: -0.01em; }
  .sub { color: var(--fg-3); font-weight: 400; font-family: var(--font-mono); font-size: 12px; margin-left: 8px; }
  .metric-switch { display: flex; gap: 2px; background: var(--bg-2); border: 1px solid var(--line-2); border-radius: var(--r-md); padding: 2px; }
  .metric-switch button {
    background: transparent;
    border: 0;
    color: var(--fg-2);
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border-radius: var(--r-sm);
    cursor: pointer;
  }
  .metric-switch button.active { background: var(--bg-0); color: var(--c); box-shadow: inset 0 0 0 1px var(--c); }

  .chart-wrap { padding: 4px; }
  .chart-foot {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px 0;
    font-size: 11px;
    color: var(--fg-3);
    font-family: var(--font-mono);
  }
  .clear { background: transparent; border: 1px solid var(--line-2); color: var(--fg-2); padding: 2px 8px; border-radius: var(--r-sm); cursor: pointer; font-family: inherit; font-size: 11px; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }
  .stat { text-align: center; padding: 4px; }
  .s-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fg-3); }
  .s-value { font-family: var(--font-mono); font-size: 22px; font-weight: 600; margin-top: 4px; letter-spacing: -0.02em; }
  .s-unit { font-size: 12px; color: var(--fg-3); margin-left: 2px; font-weight: 400; }

  .rows { font-family: var(--font-mono); font-size: 12px; }
  .r-head, .r {
    display: grid;
    grid-template-columns: 200px 1fr 1fr 1fr;
    gap: 12px;
    padding: 6px 8px;
  }
  .r-head { color: var(--fg-3); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--line-1); }
  .r:hover { background: var(--bg-2); }
  .r-t { color: var(--fg-2); }
</style>
