<script lang="ts">
  import { SvelteFlow, Background, BackgroundVariant, Controls, type Node, type Edge } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { Badge, Card, NodeBadge } from '@red-ui/ui-kit'
  import EmptyState from '$lib/EmptyState.svelte'
  import ClusterNode from '$lib/ClusterNode.svelte'
  import { PRESETS } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import { activity } from '$lib/activity.svelte'
  import { theme } from '$lib/theme.svelte'
  import { RedClient, type ClusterStatus, type Stats, type ReplicationStatus } from '@red-ui/protocol'
  import { ServerCrash } from 'lucide-svelte'

  interface KnownNode {
    id: string
    preset: typeof PRESETS[number]
    reachable: boolean
    role: 'primary' | 'replica' | 'standalone'
    stats?: Stats
    replication?: ReplicationStatus
    cluster?: ClusterStatus
  }

  let known = $state<KnownNode[]>([])
  let loading = $state(true)
  let selectedId = $state<string | null>(null)
  // Per-preset failure tracking. Dead nodes back off to one probe per ~60s
  // instead of one per 5s so unreachable presets (e.g. embedded with no
  // local file-backed reddb running) don't flood DevTools with native
  // fetch errors. Browser logs network failures before catch() executes,
  // so the only fix is to attempt the request less often.
  const failCount = new Map<string, number>()
  const lastAttempt = new Map<string, number>()
  const DEAD_BACKOFF_MS = 60_000

  const nodeTypes = { cluster: ClusterNode as any }

  // Theme-aware palette for things xyflow renders as literal SVG attrs
  // (it cannot read CSS variables for `style`/`labelStyle`/`patternColor`).
  const palette = $derived.by(() => {
    const dark = theme.current === 'dark'
    return {
      ok: dark ? '#4ade80' : '#16a34a',
      warn: dark ? '#fbbf24' : '#b45309',
      pattern: dark ? '#1c2027' : '#d4d4d8',
      labelBg: dark ? '#0d0f13' : '#fafafa',
      labelStroke: dark ? '#2a2e36' : '#d4d4d8',
    }
  })

  async function probeAll() {
    const now = Date.now()
    const results = await Promise.all(
      PRESETS.map(async (p) => {
        const fails = failCount.get(p.id) ?? 0
        const last = lastAttempt.get(p.id) ?? 0
        // After 2 consecutive failures, only retry once per DEAD_BACKOFF_MS.
        // Carry the previous (unreachable) snapshot through so the UI stays stable.
        if (fails >= 2 && now - last < DEAD_BACKOFF_MS) {
          return known.find((k) => k.id === p.id) ?? {
            id: p.id, preset: p, reachable: false, role: 'standalone' as const,
          }
        }
        lastAttempt.set(p.id, now)
        const client = new RedClient(p.url)
        try {
          const [stats, replication, cluster] = await Promise.all([
            activity.track(`cluster · ${p.label} stats`, () => client.stats()),
            activity
              .track(`cluster · ${p.label} replication`, () => client.replication())
              .catch(() => undefined),
            activity
              .track(`cluster · ${p.label} status`, () => client.clusterStatus())
              .catch(() => undefined),
          ])
          failCount.set(p.id, 0)
          return {
            id: p.id, preset: p, reachable: true,
            role: replication?.role ?? 'standalone',
            stats, replication, cluster,
          } as KnownNode
        } catch {
          failCount.set(p.id, fails + 1)
          return { id: p.id, preset: p, reachable: false, role: 'standalone' as const }
        }
      }),
    )
    known = results
    loading = false
  }

  $effect(() => {
    // Same hard lock gate as the workspace: don't probe nodes until the
    // user authenticates this session.
    if (secureStore.locked) return
    probeAll()
    const id = setInterval(probeAll, 5000)
    return () => clearInterval(id)
  })

  const liveNodes = $derived(known.filter((k) => k.reachable))

  const flowNodes = $derived<Node[]>(
    liveNodes.map((k) => {
      const slot = k.role === 'primary' ? 0 : k.role === 'replica' ? 1 : -1
      return {
        id: k.id,
        type: 'cluster',
        position: { x: 320 + slot * 320, y: 200 },
        data: {
          label: k.preset.label,
          role: k.role,
          collections: k.stats?.store.collection_count ?? 0,
          entities: k.stats?.store.total_entities ?? 0,
          url: k.preset.url,
        },
      }
    }),
  )

  const flowEdges = $derived<Edge[]>(
    liveNodes
      .filter((k) => k.role === 'replica')
      .map((replica) => {
        const primary = liveNodes.find((p) => p.role === 'primary')
        if (!primary) return null
        const lag = replica.replication?.last_applied_lsn !== undefined && replica.replication?.last_seen_primary_lsn !== undefined
          ? replica.replication.last_seen_primary_lsn - replica.replication.last_applied_lsn
          : null
        const inSync = lag === 0
        const stroke = inSync ? palette.ok : palette.warn
        return {
          id: `${primary.id}-${replica.id}`,
          source: primary.id,
          target: replica.id,
          type: 'smoothstep',
          animated: true,
          style: `stroke:${stroke};stroke-width:1.5;opacity:0.7`,
          label: lag === null ? '' : inSync ? '✓ in sync' : `lag ${lag}`,
          labelStyle: `fill:${stroke};font-family:JetBrains Mono Variable;font-size:10px;font-weight:500`,
          labelBgStyle: `fill:${palette.labelBg};stroke:${palette.labelStroke};stroke-width:1`,
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
        } as Edge
      })
      .filter((e): e is Edge => e !== null),
  )

  const selected = $derived(known.find((k) => k.id === selectedId))
  const totalEntities = $derived(liveNodes.reduce((s, k) => s + (k.stats?.store.total_entities ?? 0), 0))

  function deploymentLabel(node: KnownNode): string {
    const mode = node.cluster?.deployment?.mode
    if (mode) return mode
    if (node.preset.id === 'embedded') return 'embedded file endpoint'
    if (node.preset.id.startsWith('docker-')) return 'server · docker preset'
    return 'server endpoint'
  }

  function deploymentEvidence(node: KnownNode): string {
    const d = node.cluster?.deployment
    if (d?.file_path) return d.file_path
    if (d?.container_id || d?.image) return [d.container_id, d.image].filter(Boolean).join(' · ')
    if (d?.configured_by || d?.process_kind) return [d.configured_by, d.process_kind].filter(Boolean).join(' · ')
    if (node.preset.id === 'embedded') return node.preset.description
    if (node.preset.id.startsWith('docker-')) return node.preset.description
    return 'reddb has not exposed process/container metadata yet'
  }

  function deploymentTone(node: KnownNode): 'neutral' | 'ok' | 'info' | 'warn' | 'danger' | 'accent' {
    const mode = node.cluster?.deployment?.mode
    if (mode === 'docker') return 'info'
    if (mode === 'embedded') return 'ok'
    if (mode === 'replicated') return 'accent'
    if (node.preset.id.startsWith('docker-')) return 'info'
    if (node.preset.id === 'embedded') return 'ok'
    return 'neutral'
  }

  function fmtBytes(bytes: number | undefined): string {
    if (bytes === undefined || !Number.isFinite(bytes)) return 'not exposed'
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GiB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`
    return `${bytes} B`
  }

  function fmtPct(used: number, total: number): string {
    if (total <= 0) return 'n/a'
    return `${Math.round((used / total) * 100)}%`
  }

  function uptime(ms: number): string {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
    if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
    return `${s}s`
  }

  function replicationLag(node: KnownNode): number | null {
    const r = node.replication
    if (r?.last_applied_lsn === undefined || r.last_seen_primary_lsn === undefined) return null
    return r.last_seen_primary_lsn - r.last_applied_lsn
  }

  function ramUsed(stats: Stats): number {
    return stats.system.total_memory_bytes - stats.system.available_memory_bytes
  }

  function firstNumber(...values: Array<number | undefined>): number | undefined {
    return values.find((v) => v !== undefined && Number.isFinite(v))
  }

  function fmtRate(value: number | undefined): string {
    return value === undefined || !Number.isFinite(value) ? 'not exposed' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}/s`
  }

  function fmtMs(value: number | undefined): string {
    return value === undefined || !Number.isFinite(value) ? 'not exposed' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ms`
  }

  function storageLine(node: KnownNode): string {
    const used = node.cluster?.storage?.used_bytes
    const capacity = node.cluster?.storage?.capacity_bytes
    const free = node.cluster?.storage?.free_bytes
    if (used === undefined && capacity === undefined && free === undefined) return 'not exposed'
    if (used !== undefined && capacity !== undefined) return `${fmtBytes(used)} / ${fmtBytes(capacity)} (${fmtPct(used, capacity)})`
    if (used !== undefined && free !== undefined) return `${fmtBytes(used)} used · ${fmtBytes(free)} free`
    if (capacity !== undefined && free !== undefined) return `${fmtBytes(free)} free / ${fmtBytes(capacity)}`
    return fmtBytes(used ?? capacity ?? free)
  }

  function missingTelemetryExposed(node: KnownNode, item: string): boolean | ClusterStatus['deployment'] | ClusterStatus['storage'] | ClusterStatus['throughput'] {
    if (item === 'storage capacity') return node.cluster?.storage
    if (item === 'wal size bytes') return node.cluster?.wal?.size_bytes !== undefined
    if (item === 'throughput') return node.cluster?.throughput
    if (item === 'avg response time') return node.cluster?.throughput?.avg_response_ms !== undefined
    if (item === 'cpu usage') return node.cluster?.system?.cpu_usage_percent !== undefined
    if (item === 'deployment metadata') return node.cluster?.deployment
    return false
  }

  const missingClusterTelemetry = [
    'storage capacity',
    'wal size bytes',
    'throughput',
    'avg response time',
    'cpu usage',
    'deployment metadata',
  ]
</script>

{#if loading}
  <div class="absolute inset-0 grid place-items-center text-fg-3 font-mono text-[12px]">
    Probing reachable nodes…
  </div>
{:else if liveNodes.length === 0}
  <div class="p-6">
    <EmptyState
      icon={ServerCrash}
      title="No reachable nodes"
      message="None of the configured reddb endpoints responded. Start one and the topology will populate automatically."
      hint="docker compose -f docker/compose.yml up -d"
    />
  </div>
{:else}
  <div class="absolute inset-0">
    <SvelteFlow
      nodes={flowNodes}
      edges={flowEdges}
      {nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      onnodeclick={(e) => (selectedId = e.node.id)}
    >
      <Background variant={BackgroundVariant.Dots} bgColor="transparent" patternColor={palette.pattern} gap={32} size={1} />
      <Controls position="bottom-right" />
    </SvelteFlow>
  </div>

  <!-- Floating summary (top-left) -->
  <div class="absolute top-4 left-4 z-10 w-64">
    <Card title="cluster">
      <div class="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-line-1">
        <div>
          <div class="type-label">reachable</div>
          <div class="font-mono text-fg-0 text-[18px] font-semibold mt-0.5">
            {liveNodes.length}<span class="text-fg-3 text-[11px] font-normal ml-1">of {known.length}</span>
          </div>
        </div>
        <div>
          <div class="type-label">entities</div>
          <div class="font-mono text-accent text-[18px] font-semibold mt-0.5">{totalEntities.toLocaleString()}</div>
        </div>
      </div>

      <div class="grid gap-1">
        {#each liveNodes as k}
          <button
            class={[
              'flex items-center gap-2.5 px-2 py-1.5 rounded text-left bg-transparent border-0 cursor-pointer transition-colors',
              selectedId === k.id ? 'bg-bg-2' : 'hover:bg-bg-2'
            ].join(' ')}
            onclick={() => (selectedId = k.id)}
          >
            <span class={[
              'w-1.5 h-1.5 rounded-full shrink-0',
              k.role === 'primary' ? 'bg-role-primary' : k.role === 'replica' ? 'bg-role-replica' : 'bg-role-embedded'
            ].join(' ')}></span>
            <span class="font-mono text-[11px] text-fg-1 flex-1 truncate">{k.preset.label}</span>
            <span class="font-mono text-[10px] text-fg-3">{k.stats?.store.total_entities.toLocaleString() ?? 0}</span>
          </button>
        {/each}
      </div>
    </Card>
  </div>

  <!-- Floating inspector (top-right) -->
  {#if selected}
    <div class="absolute top-4 right-4 z-10 w-[420px] max-h-[calc(100vh-96px)] overflow-auto">
      <Card title="node · {selected.id}" floating>
        <div class="grid gap-2 font-mono text-[11px]">
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-fg-3">label</span>
            <span class="text-fg-0">{selected.preset.label}</span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-fg-3">url</span>
            <code class="text-fg-0 break-all">{selected.preset.url}</code>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-fg-3">deployment</span>
            <span>
              <Badge tone={deploymentTone(selected)}>
                {deploymentLabel(selected)}
              </Badge>
            </span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-fg-3">evidence</span>
            <span class="text-fg-1">{deploymentEvidence(selected)}</span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-fg-3">role</span>
            <span><NodeBadge role={selected.role === 'primary' ? 'primary' : selected.role === 'replica' ? 'replica' : 'embedded'} label={selected.role} /></span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-fg-3">replicas</span>
            <span class="text-fg-0">
              {#if selected.replication?.role === 'primary'}
                {selected.replication.replica_count ?? 0}
              {:else if selected.replication?.role === 'replica'}
                connected to {selected.replication.primary_addr ?? 'primary'}
              {:else}
                none exposed
              {/if}
            </span>
          </div>
          {#if selected.stats}
            <div class="pt-2 mt-1 border-t border-line-1"></div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">host</span>
              <span class="text-fg-0">{selected.stats.system.hostname} · {selected.stats.system.os}/{selected.stats.system.arch}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">process</span>
              <span class="text-fg-0">pid {selected.stats.system.pid}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">connections</span>
              <span class="text-fg-0">{selected.stats.active_connections} active <span class="text-fg-3">/ {selected.stats.idle_connections} idle</span></span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">collections</span>
              <span class="text-fg-0">{selected.stats.store.collection_count}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">entities</span>
              <span class="text-accent">{selected.stats.store.total_entities.toLocaleString()}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">cross refs</span>
              <span class="text-fg-0">{selected.stats.store.cross_ref_count.toLocaleString()}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">store memory</span>
              <span class="text-fg-0">{fmtBytes(selected.stats.store.total_memory_bytes)}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">storage</span>
              <span class="text-fg-0">{storageLine(selected)}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">ram</span>
              <span class="text-fg-0">
                {fmtBytes(firstNumber(selected.cluster?.system?.memory_used_bytes, ramUsed(selected.stats)))} used
                <span class="text-fg-3">
                  / {fmtBytes(firstNumber(selected.cluster?.system?.memory_total_bytes, selected.stats.system.total_memory_bytes))}
                  ({fmtPct(firstNumber(selected.cluster?.system?.memory_used_bytes, ramUsed(selected.stats)) ?? 0, firstNumber(selected.cluster?.system?.memory_total_bytes, selected.stats.system.total_memory_bytes) ?? 0)})
                </span>
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">cpu</span>
              <span class="text-fg-0">
                {selected.stats.system.cpu_cores} cores
                <span class="text-fg-3">· {selected.cluster?.system?.cpu_usage_percent === undefined ? 'usage not exposed' : `${selected.cluster.system.cpu_usage_percent}%`}</span>
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">requests/sec</span>
              <span class="text-fg-0">{fmtRate(selected.cluster?.throughput?.requests_per_second)}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">read/write</span>
              <span class="text-fg-0">{fmtRate(selected.cluster?.throughput?.reads_per_second)} <span class="text-fg-3">/ {fmtRate(selected.cluster?.throughput?.writes_per_second)}</span></span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">avg response</span>
              <span class="text-fg-0">{fmtMs(selected.cluster?.throughput?.avg_response_ms)}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">uptime</span>
              <span class="text-fg-0">{uptime(selected.stats.started_at_unix_ms)}</span>
            </div>
          {/if}
          {#if selected.replication}
            <div class="pt-2 mt-1 border-t border-line-1"></div>
            {#if selected.replication.role === 'primary'}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">wal lsn</span>
                <span class="text-fg-0">{selected.cluster?.wal?.lsn ?? selected.replication.wal_lsn}</span>
              </div>
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">wal size</span>
                <span class="text-fg-0">{fmtBytes(selected.cluster?.wal?.size_bytes)}</span>
              </div>
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">oldest lsn</span>
                <span class="text-fg-0">{selected.cluster?.wal?.oldest_lsn ?? selected.replication.oldest_lsn ?? 'not exposed'}</span>
              </div>
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">replicas</span>
                <span class="text-fg-0">{selected.cluster?.replication?.replica_count ?? selected.replication.replica_count ?? 0}</span>
              </div>
            {:else if selected.replication.role === 'replica'}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">applied</span>
                <span class="text-fg-0">{selected.replication.last_applied_lsn} <span class="text-fg-3">/ {selected.replication.last_seen_primary_lsn}</span></span>
              </div>
              {@const lag = replicationLag(selected)}
              {#if lag !== null}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-fg-3">lag</span>
                  <span>
                    {#if lag === 0}<Badge tone="ok">in sync</Badge>{:else}<Badge tone="warn">{selected.cluster?.replication?.lag_ms ? `${selected.cluster.replication.lag_ms} ms` : `${selected.cluster?.replication?.lag_lsn ?? lag} lsn`}</Badge>{/if}
                  </span>
                </div>
              {/if}
            {/if}
          {/if}
          <div class="pt-2 mt-1 border-t border-line-1"></div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-start">
            <span class="text-fg-3">not exposed</span>
            <span class="flex flex-wrap gap-1">
              {#each missingClusterTelemetry as item}
                {#if !missingTelemetryExposed(selected, item)}
                  <span class="rounded border border-line-1 px-1.5 py-0.5 text-[10px] text-fg-3">{item}</span>
                {/if}
              {/each}
            </span>
          </div>
        </div>
      </Card>
    </div>
  {/if}
{/if}

<!-- xyflow chrome — keep handles invisible and route control colors through tokens
     so light/dark themes both look right. -->
<style>
  :global(.svelte-flow) {
    background-color: var(--color-bg-0) !important;
    --xy-background-color-default: var(--color-bg-0);
  }
  :global(.svelte-flow__handle) {
    opacity: 0 !important;
    pointer-events: none !important;
    width: 1px !important;
    height: 1px !important;
  }
  :global(.svelte-flow__node-cluster) {
    background: transparent !important;
    border: 0 !important;
    padding: 0 !important;
  }
  :global(.svelte-flow__edge-path) {
    stroke-linecap: round;
  }
  :global(.svelte-flow__edge-textbg) {
    fill: var(--color-bg-1) !important;
    stroke: var(--color-line-2) !important;
  }
  :global(.svelte-flow__controls) {
    box-shadow: var(--shadow-md) !important;
    border: 1px solid var(--color-line-2) !important;
    border-radius: 6px !important;
    overflow: hidden;
    background: var(--color-bg-1) !important;
  }
  :global(.svelte-flow__controls button) {
    background: var(--color-bg-1) !important;
    border-bottom: 1px solid var(--color-line-1) !important;
    color: var(--color-fg-2) !important;
    fill: var(--color-fg-2) !important;
  }
  :global(.svelte-flow__controls button:hover) {
    background: var(--color-bg-2) !important;
    color: var(--color-fg-0) !important;
    fill: var(--color-fg-0) !important;
  }
</style>
