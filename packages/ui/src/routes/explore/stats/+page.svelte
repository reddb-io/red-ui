<script lang="ts">
  import { Badge, Card, NodeBadge } from '@red-ui/ui-kit'
  import { stats as fixtureStats } from '$lib/fixtures'
  import { connection } from '$lib/connections.svelte'
  import PageHeader from '$lib/PageHeader.svelte'

  const live = $derived(connection.probe.reachable && connection.probe.stats)

  const stats = $derived.by(() => {
    if (!live || !connection.probe.stats) return fixtureStats
    const s = connection.probe.stats
    const r = connection.probe.replication
    return {
      cluster: {
        primaries: r?.role === 'primary' || r?.role === 'standalone' ? 1 : 0,
        replicas: r?.role === 'replica' ? 1 : 0,
        total_size: formatBytes(s.store.total_memory_bytes),
        keys: s.store.total_entities.toLocaleString(),
        ops_per_sec: (s.kv?.gets ?? 0) + (s.kv?.puts ?? 0),
      },
      nodes: [
        {
          id: r?.role ?? 'standalone',
          size_gb: +(s.store.total_memory_bytes / 1e9).toFixed(2),
          keys_m: +(s.store.total_entities / 1e6).toFixed(3),
          cpu: Math.round((s.active_connections / 10) * 50),
          mem: Math.round((1 - s.system.available_memory_bytes / s.system.total_memory_bytes) * 100),
          lag_ms: r?.last_applied_lsn !== undefined && r?.last_seen_primary_lsn !== undefined
            ? (r.last_seen_primary_lsn - r.last_applied_lsn)
            : 0,
        },
      ],
      top_keys: fixtureStats.top_keys,
    }
  })

  function formatBytes(b: number) {
    if (b === 0) return '0 B'
    if (b < 1e6) return `${(b / 1e3).toFixed(1)} KB`
    if (b < 1e9) return `${(b / 1e6).toFixed(1)} MB`
    return `${(b / 1e9).toFixed(2)} GB`
  }

  function bar(value: number, max = 100, color = 'var(--accent)') {
    const pct = Math.min(100, (value / max) * 100)
    return `width: ${pct}%; background: ${color};`
  }

  // Tiny sparkline generator
  function sparkPath(values: number[], w = 80, h = 24) {
    const min = Math.min(...values), max = Math.max(...values)
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * w} ${h - ((v - min) / (max - min || 1)) * h}`).join(' ')
  }

  const cpuSpark = Array.from({ length: 30 }, () => 30 + Math.random() * 40)
  const memSpark = Array.from({ length: 30 }, (_, i) => 40 + Math.sin(i / 3) * 10 + Math.random() * 5)
  const qpsSpark = Array.from({ length: 30 }, (_, i) => 2000 + Math.sin(i / 4) * 1500 + Math.random() * 600)
</script>

<PageHeader
  eyebrow="Explore"
  title="Statistics"
  subtitle={connection.probe.reachable ? `Live from ${connection.active.label}` : 'Fixtures — connect to see live cluster metrics'}
/>

<div class="layout">
  <div class="kpis">
    <Card>
      <div class="kpi">
        <div class="k-label">primaries</div>
        <div class="k-value">{stats.cluster.primaries}</div>
      </div>
    </Card>
    <Card>
      <div class="kpi">
        <div class="k-label">replicas</div>
        <div class="k-value">{stats.cluster.replicas}</div>
      </div>
    </Card>
    <Card>
      <div class="kpi">
        <div class="k-label">total size</div>
        <div class="k-value">{stats.cluster.total_size}</div>
      </div>
    </Card>
    <Card>
      <div class="kpi">
        <div class="k-label">keys</div>
        <div class="k-value">{stats.cluster.keys}</div>
      </div>
    </Card>
    <Card>
      <div class="kpi">
        <div class="k-label">ops/s</div>
        <div class="k-value accent">{stats.cluster.ops_per_sec.toLocaleString()}</div>
        <svg viewBox="0 0 80 24" class="spark"><path d={sparkPath(qpsSpark)} fill="none" stroke="var(--accent)" stroke-width="1.4" /></svg>
      </div>
    </Card>
  </div>

  <div class="row">
    <Card title="nodes · health">
      <div class="nodes">
        <div class="n-head">
          <span>node</span><span>size</span><span>keys</span><span>CPU</span><span>MEM</span><span>lag</span>
        </div>
        {#each stats.nodes as n}
          <div class="n-row">
            <span>
              <NodeBadge role={n.id === 'primary' ? 'primary' : 'replica'} label={n.id} />
            </span>
            <span class="mono">{n.size_gb} GB</span>
            <span class="mono">{n.keys_m}M</span>
            <span class="bar-cell">
              <span class="bar-bg"><span class="bar" style={bar(n.cpu, 100, n.cpu > 75 ? 'var(--warn)' : 'var(--ok)')}></span></span>
              <span class="bar-label">{n.cpu}%</span>
            </span>
            <span class="bar-cell">
              <span class="bar-bg"><span class="bar" style={bar(n.mem, 100, 'var(--info)')}></span></span>
              <span class="bar-label">{n.mem}%</span>
            </span>
            <span>
              {#if n.lag_ms === 0}<Badge tone="ok">in sync</Badge>
              {:else if n.lag_ms < 10}<Badge tone="ok">{n.lag_ms}ms</Badge>
              {:else}<Badge tone="warn">{n.lag_ms}ms</Badge>{/if}
            </span>
          </div>
        {/each}
      </div>
    </Card>

    <Card title="top keys by count">
      <div class="top">
        {#each stats.top_keys as k}
          <div class="t-row">
            <code class="t-key">{k.key}</code>
            <span class="t-count mono">{k.count.toLocaleString()}</span>
            <span class="t-size mono">{k.size}</span>
          </div>
        {/each}
      </div>
    </Card>
  </div>

  <div class="row">
    <Card title="CPU · 30m rolling">
      <div class="big-spark">
        <svg viewBox="0 0 80 24" preserveAspectRatio="none"><path d={sparkPath(cpuSpark)} fill="none" stroke="var(--warn)" stroke-width="0.5" vector-effect="non-scaling-stroke" /></svg>
      </div>
    </Card>
    <Card title="Memory · 30m rolling">
      <div class="big-spark">
        <svg viewBox="0 0 80 24" preserveAspectRatio="none"><path d={sparkPath(memSpark)} fill="none" stroke="var(--info)" stroke-width="0.5" vector-effect="non-scaling-stroke" /></svg>
      </div>
    </Card>
    <Card title="QPS · 30m rolling">
      <div class="big-spark">
        <svg viewBox="0 0 80 24" preserveAspectRatio="none"><path d={sparkPath(qpsSpark)} fill="none" stroke="var(--accent)" stroke-width="0.5" vector-effect="non-scaling-stroke" /></svg>
      </div>
    </Card>
  </div>
</div>

<style>
  .layout { display: grid; gap: 12px; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .kpi { padding: 4px 8px; }
  .k-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fg-3); }
  .k-value { font-family: var(--font-mono); font-size: 22px; font-weight: 600; margin-top: 4px; letter-spacing: -0.02em; }
  .k-value.accent { color: var(--accent); }
  .spark { width: 80px; height: 24px; margin-top: 6px; opacity: 0.6; }

  .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .row :global(.card) { min-width: 0; }
  @media (max-width: 1100px) { .row { grid-template-columns: 1fr; } .kpis { grid-template-columns: repeat(3, 1fr); } }

  .nodes { font-family: var(--font-mono); font-size: 11px; }
  .n-head, .n-row {
    display: grid;
    grid-template-columns: 110px 60px 50px 1fr 1fr 60px;
    gap: 10px;
    padding: 6px 4px;
    align-items: center;
  }
  .n-head { color: var(--fg-3); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--line-1); }
  .n-row { border-bottom: 1px solid var(--line-1); }
  .n-row:last-child { border-bottom: 0; }
  .mono { color: var(--fg-1); }
  .bar-cell { display: flex; align-items: center; gap: 6px; }
  .bar-bg { flex: 1; height: 4px; background: var(--bg-3); border-radius: 9999px; overflow: hidden; }
  .bar { display: block; height: 100%; transition: width 320ms var(--ease-out); }
  .bar-label { color: var(--fg-2); font-size: 10px; width: 28px; text-align: right; }

  .top { display: grid; gap: 4px; font-family: var(--font-mono); font-size: 12px; }
  .t-row { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; padding: 6px 4px; border-radius: var(--r-sm); }
  .t-row:hover { background: var(--bg-2); }
  .t-key { color: var(--fg-0); overflow: hidden; text-overflow: ellipsis; }
  .t-count { color: var(--accent); }
  .t-size { color: var(--fg-2); }

  .big-spark { padding: 8px 0; }
  .big-spark svg { width: 100%; height: 80px; }
</style>
