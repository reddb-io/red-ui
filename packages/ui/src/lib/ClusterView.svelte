<script lang="ts">
  import { Button as DSButton } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  import Diagram, { type DiagramData } from '@reddb-io/design-system/data/Diagram'
  import PanZoomViewport from '@reddb-io/design-system/data/PanZoomViewport'
  import { LoadingIndicator } from '@reddb-io/design-system/base'
  import { Badge, Card } from '@reddb-io/design-system/base'
  import EmptyState from '$lib/EmptyState.svelte'
  import { accessLocked, connectionLost } from '@reddb-io/design-system/base/illustrations'
  import { PRESETS } from '$lib/connections.svelte'

  import { useRouter } from '$lib/router.svelte'
  import { POLICY_READ_CHECK } from '$lib/policies'
  import {
    RedClient,
    type ClusterStatus,
    type Stats,
    type ReplicationStatus,
    type NodeTopology,
    measured,
    reasonOf,
    topologyOf,
    bootDurationMs,
    maxReplicaLagSeconds,
    unavailableFields,
  } from '#reddb'

  const workspace = useWorkspace()
  const { activity, connection, secureStore } = workspace

  interface KnownNode {
    id: string
    preset: typeof PRESETS[number]
    reachable: boolean
    role: 'primary' | 'replica' | 'standalone'
    stats?: Stats
    replication?: ReplicationStatus
    cluster?: ClusterStatus
  }

  // The high-level topology of a node (embedded · serverless · replicated ·
  // server), derived from deployment shape × replication role. Drives which
  // "hero metric" the node leads with.
  function topology(node: KnownNode): NodeTopology {
    return topologyOf(node.cluster, node.replication, node.preset.role)
  }

  const TOPOLOGY_LABEL: Record<NodeTopology, string> = {
    embedded: 'embedded · standalone',
    serverless: 'serverless',
    replicated: 'primary / replica',
    server: 'server · standalone',
    unknown: 'unknown',
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

  async function probeAll() {
    const active = connection.connected ? connection.active : null
    const activeClient = connection.client
    const presets = active ? [active, ...PRESETS.filter(p => p.url !== active.url)] : PRESETS
    const now = Date.now()
    const results = await Promise.all(
      presets.map(async (p) => {
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
        const client = activeClient && p.url === active?.url ? activeClient : new RedClient(p.url)
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
    // user authenticates this session — automatic probes would leak the
    // configured topology to anyone watching the network panel. Flip
    // `loading` off so the UI shows a locked EmptyState instead of an
    // infinite "Probing…" message.
    if (secureStore.locked) {
      loading = false
      return
    }
    loading = true
    probeAll()
    const id = setInterval(probeAll, 5000)
    return () => clearInterval(id)
  })

  const liveNodes = $derived(known.filter((k) => k.reachable))

  const diagram = $derived<DiagramData>({
    nodes: liveNodes.map(node => ({
      id: node.id, label: node.preset.label, kind: 'store', series: node.role === 'primary' ? 1 : node.role === 'replica' ? 2 : 3,
      description: `${node.role} · ${(node.stats?.store.total_entities ?? 0).toLocaleString()} entities`,
    })),
    edges: liveNodes.filter(node => node.role === 'replica').flatMap(replica => {
      const primary = liveNodes.find(node => node.role === 'primary')
      if (!primary) return []
      const replication = replica.replication
      const lag = replication?.last_applied_lsn !== undefined && replication.last_seen_primary_lsn !== undefined
        ? replication.last_seen_primary_lsn - replication.last_applied_lsn : null
      return [{ id: `${primary.id}-${replica.id}`, source: primary.id, target: replica.id,
        label: lag === null ? 'Lag not exposed' : lag === 0 ? 'In sync' : `Lag ${lag}`, dashed: lag !== 0 }]
    }),
  })

  const selected = $derived(known.find((k) => k.id === selectedId))
  // Hoisted out of the template: `{@const}` can't be a child of a plain
  // element, only of a block/component, so derive the inspector's computed
  // bits here and reference them below.
  const selectedHero = $derived(selected ? heroMetric(selected) : null)
  const selectedTopology = $derived<NodeTopology>(selected ? topology(selected) : 'unknown')
  const selectedMissing = $derived(selected ? notExposed(selected) : [])
  const totalEntities = $derived(liveNodes.reduce((s, k) => s + (k.stats?.store.total_entities ?? 0), 0))

  // Metalanguage (users · tenants · policies) is authed and per-connection, so
  // it's only meaningful for the node we're actually connected to. For every
  // other probed node we say so honestly rather than faking a surface we have
  // no token for. Visibility is permission-aware: tenants/users are gated
  // server-side; policies appear only when auth.can(policy:read) allows it —
  // mirroring SecurityView's contract.
  const router = useRouter()
  const isConnectedNode = $derived(
    !!selected && connection.connected && !secureStore.locked && connection.active?.url === selected.preset.url,
  )

  interface MetaSummary {
    username?: string
    role?: string
    users?: number
    tenants?: number
    policies?: number
    policyAllowed?: boolean
    error?: string
  }
  let meta = $state<MetaSummary | null>(null)

  $effect(() => {
    const sel = selected
    void selectedId
    if (!sel || !isConnectedNode) {
      meta = null
      return
    }
    const client = connection.client
    if (!client) {
      meta = null
      return
    }
    let cancelled = false
    void (async () => {
      const next: MetaSummary = {}
      try {
        const w = await activity.track('cluster · whoami', () => client.whoami())
        next.username = w.username
        next.role = w.role
      } catch (e) {
        next.error = (e as Error).message
      }
      try {
        next.users = (await activity.track('cluster · users', () => client.users())).length
      } catch {
        /* server-gated: leave undefined (absent, not faked) */
      }
      try {
        next.tenants = (await activity.track('cluster · tenants', () => client.tenants())).length
      } catch {
        /* server-gated */
      }
      try {
        const [decision] = await activity.track('cluster · auth.can policy read', () =>
          client.authCan([POLICY_READ_CHECK]),
        )
        next.policyAllowed = decision?.allowed === true
        if (next.policyAllowed) {
          try {
            next.policies = (await activity.track('cluster · policies', () => client.policies())).length
          } catch {
            /* allowed but read failed */
          }
        }
      } catch {
        next.policyAllowed = false
      }
      if (!cancelled) meta = next
    })()
    return () => {
      cancelled = true
    }
  })

  type Tone = 'neutral' | 'success' | 'info' | 'warning' | 'danger'

  function deploymentLabel(node: KnownNode): string {
    const shape = measured(node.cluster?.deployment?.shape)
    if (shape) return shape
    if (node.preset.id === 'embedded') return 'embedded'
    if (node.preset.id.startsWith('docker-')) return 'server · docker preset'
    return 'server'
  }

  function deploymentEvidence(node: KnownNode): string {
    // reddb no longer exposes a file path / container id (#738 honesty
    // contract). Lean on the active transport listeners it does report, then
    // fall back to the preset description.
    const listener = node.cluster?.transports?.active?.[0]
    if (listener) return `${listener.transport} · ${listener.bind_addr}`
    const backend = node.cluster?.storage?.remote_backend
    if (backend) return `remote backend · ${backend}`
    return node.preset.description
  }

  function deploymentTone(node: KnownNode): Tone {
    switch (topology(node)) {
      case 'replicated':
        return 'neutral'
      case 'embedded':
        return 'success'
      case 'serverless':
        return 'info'
      default:
        return 'neutral'
    }
  }

  function fmtDuration(ms: number | null | undefined): string {
    if (ms === null || ms === undefined || !Number.isFinite(ms)) return 'not exposed'
    if (ms < 1000) return `${Math.round(ms)} ms`
    if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
    return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
  }

  function fmtLagSeconds(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return 'not exposed'
    if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  }

  /** Records the replica is behind, from the replica's own perspective. */
  function replicaLagRecords(node: KnownNode): number | null {
    const r = node.replication
    if (r?.last_applied_lsn === undefined || r.last_seen_primary_lsn === undefined) return null
    return r.last_seen_primary_lsn - r.last_applied_lsn
  }

  interface Hero {
    label: string
    value: string
    tone: Tone
    sub?: string
  }

  // The single metric each topology leads with — the thing the user said
  // matters most for that shape. Primary→replication lag (wall-clock),
  // serverless→boot time, embedded→on-disk size, server→entities.
  function heroMetric(node: KnownNode): Hero {
    const topo = topology(node)
    if (topo === 'replicated') {
      if (node.role === 'primary') {
        const replicas = node.replication?.replicas ?? []
        const worst = maxReplicaLagSeconds(node.replication)
        if (replicas.length === 0) return { label: 'replication lag', value: 'no replicas', tone: 'neutral' }
        if (worst === null) return { label: 'replication lag', value: 'not exposed', tone: 'neutral' }
        return {
          label: 'replication lag',
          value: worst === 0 ? '✓ in sync' : fmtLagSeconds(worst),
          tone: worst === 0 ? 'success' : worst < 5 ? 'warning' : 'danger',
          sub: `${replicas.length} replica${replicas.length === 1 ? '' : 's'} · worst case`,
        }
      }
      const lag = replicaLagRecords(node)
      return {
        label: 'replica lag',
        value: lag === null ? 'not exposed' : lag === 0 ? '✓ in sync' : `${lag.toLocaleString()} lsn`,
        tone: lag === null ? 'neutral' : lag === 0 ? 'success' : 'warning',
        sub: node.replication?.state,
      }
    }
    if (topo === 'serverless') {
      const boot = bootDurationMs(node.cluster)
      return {
        label: 'boot time',
        value: fmtDuration(boot),
        tone: boot === null ? 'neutral' : boot < 1000 ? 'success' : boot < 5000 ? 'info' : 'warning',
        sub: node.cluster?.phase ? `phase · ${node.cluster.phase}` : undefined,
      }
    }
    if (topo === 'embedded') {
      const size = measured(node.cluster?.storage?.db_size_bytes)
      return {
        label: 'on-disk size',
        value: size === undefined ? 'not exposed' : fmtBytes(size),
        tone: size === undefined ? 'neutral' : 'success',
        sub: `${(node.stats?.store.total_entities ?? 0).toLocaleString()} entities`,
      }
    }
    const size = measured(node.cluster?.storage?.db_size_bytes)
    return {
      label: 'entities',
      value: (node.stats?.store.total_entities ?? 0).toLocaleString(),
      tone: 'neutral',
      sub: size === undefined ? undefined : `${fmtBytes(size)} on disk`,
    }
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

  function fmtRate(value: number | undefined): string {
    return value === undefined || !Number.isFinite(value) ? 'not exposed' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}/s`
  }

  function fmtMs(value: number | undefined): string {
    return value === undefined || !Number.isFinite(value) ? 'not exposed' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ms`
  }

  function storageLine(node: KnownNode): string {
    const size = measured(node.cluster?.storage?.db_size_bytes)
    const backend = node.cluster?.storage?.remote_backend
    if (size !== undefined) {
      return backend ? `${fmtBytes(size)} · ${backend}` : fmtBytes(size)
    }
    if (backend) return `remote · ${backend}`
    const reason = reasonOf(node.cluster?.storage?.db_size_bytes)
    return reason ? `not exposed (${reason})` : 'not exposed'
  }

  // The server's own honesty contract (#738) tells us exactly which fields it
  // cannot measure, and why — no hand-maintained list to drift out of sync.
  function notExposed(node: KnownNode): string[] {
    return unavailableFields(node.cluster).map((f) => f.path.replace(/_/g, ' '))
  }
</script>

{#if loading}
  <div class="grid h-full place-items-center p-6"><LoadingIndicator label="Loading cluster topology" /></div>
{:else if secureStore.locked}
  <div class="p-6">
    <EmptyState
      illustration={accessLocked}
      title="Locked"
      message="Unlock the secure store to probe configured nodes. Automatic probes are paused until you authenticate this session."
    />
  </div>
{:else if liveNodes.length === 0}
  <div class="p-6">
    <EmptyState
      illustration={connectionLost}
      title="No reachable nodes"
      message="None of the configured reddb endpoints responded. Start one and the topology will populate automatically."
      hint="docker compose -f docker/compose.yml up -d"
    />
  </div>
{:else}
  <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
  <div class="min-w-0 space-y-4">
    <PanZoomViewport label="Cluster topology viewport" contentWidth={900} contentHeight={380} showControls>
      <Diagram data={diagram} label="Cluster topology" width={900} height={380}
        selected={selectedId ?? ''} onselectedchange={id => { if (liveNodes.some(node => node.id === id)) selectedId = id }} />
    </PanZoomViewport>
    <Card title="cluster">
      <div class="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-muted">
        <div>
          <div class="type-label">reachable</div>
          <div class="font-mono text-foreground text-[18px] font-semibold mt-0.5">
            {liveNodes.length}<span class="text-ink-muted text-[11px] font-normal ml-1">of {known.length}</span>
          </div>
        </div>
        <div>
          <div class="type-label">entities</div>
          <div class="font-mono text-primary-text text-[18px] font-semibold mt-0.5">{totalEntities.toLocaleString()}</div>
        </div>
      </div>

      <div class="grid gap-1">
        {#each liveNodes as k}
          <DSButton variant="ghost" size="sm" aria-pressed={selectedId === k.id}
             class="text-left"
            onclick={() => (selectedId = k.id)}
          >
            <span class={[
              'w-1.5 h-1.5 rounded-full shrink-0',
              k.role === 'primary' ? 'bg-role-primary' : k.role === 'replica' ? 'bg-role-replica' : 'bg-role-embedded'
            ].join(' ')}></span>
            <span class="font-mono text-[11px] text-foreground flex-1 truncate">{k.preset.label}</span>
            <span class="font-mono text-[10px] text-ink-muted">{k.stats?.store.total_entities.toLocaleString() ?? 0}</span>
          </DSButton>
        {/each}
      </div>
    </Card>
  </div>

  <!-- Selection details remain reachable on narrow screens. -->
  {#if selected}
    <div class="min-w-0">
      <Card title="node · {selected.id}" raised>
        <div class="grid gap-2 font-mono text-[11px]">
          {#if selectedHero}
            <div class="mb-1 rounded border border-muted bg-muted p-3">
              <div class="type-label">{selectedHero.label}</div>
              <div class={[
                'font-mono text-[22px] font-semibold mt-0.5 leading-none',
                selectedHero.tone === 'success' ? 'text-feedback-success-foreground' : selectedHero.tone === 'warning' ? 'text-feedback-warning-foreground' : selectedHero.tone === 'danger' ? 'text-feedback-danger-foreground' : 'text-foreground',
              ].join(' ')}>{selectedHero.value}</div>
              {#if selectedHero.sub}<div class="text-[10px] text-ink-muted mt-1">{selectedHero.sub}</div>{/if}
            </div>
          {/if}
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-ink-muted">topology</span>
            <span><Badge tone={deploymentTone(selected)}>{TOPOLOGY_LABEL[selectedTopology]}</Badge></span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-ink-muted">label</span>
            <span class="text-foreground">{selected.preset.label}</span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-ink-muted">url</span>
            <code class="text-foreground break-all">{selected.preset.url}</code>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-ink-muted">deployment</span>
            <span>
              <Badge tone={deploymentTone(selected)}>
                {deploymentLabel(selected)}
              </Badge>
            </span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-ink-muted">evidence</span>
            <span class="text-foreground">{deploymentEvidence(selected)}</span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-ink-muted">role</span>
            <span><Badge tone="neutral">{selected.role}</Badge></span>
          </div>
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-ink-muted">replicas</span>
            <span class="text-foreground">
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
            <div class="pt-2 mt-1 border-t border-muted"></div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">host</span>
              <span class="text-foreground">{selected.stats.system.hostname} · {selected.stats.system.os}/{selected.stats.system.arch}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">process</span>
              <span class="text-foreground">pid {selected.stats.system.pid}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">connections</span>
              <span class="text-foreground">{selected.stats.active_connections} active <span class="text-ink-muted">/ {selected.stats.idle_connections} idle</span></span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">collections</span>
              <span class="text-foreground">{selected.stats.store.collection_count}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">entities</span>
              <span class="text-primary-text">{selected.stats.store.total_entities.toLocaleString()}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">cross refs</span>
              <span class="text-foreground">{selected.stats.store.cross_ref_count.toLocaleString()}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">store memory</span>
              <span class="text-foreground">{fmtBytes(selected.stats.store.total_memory_bytes)}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">storage</span>
              <span class="text-foreground">{storageLine(selected)}</span>
            </div>
            {@const totalMem = measured(selected.cluster?.system?.total_memory_bytes) ?? selected.stats.system.total_memory_bytes}
            {@const availMem = measured(selected.cluster?.system?.available_memory_bytes) ?? selected.stats.system.available_memory_bytes}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">ram</span>
              <span class="text-foreground">
                {fmtBytes(totalMem - availMem)} used
                <span class="text-ink-muted">/ {fmtBytes(totalMem)} ({fmtPct(totalMem - availMem, totalMem)})</span>
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">cpu</span>
              <span class="text-foreground">
                {selected.stats.system.cpu_cores} cores
                {#if measured(selected.cluster?.system?.cpu_usage) !== undefined}
                  <span class="text-ink-muted">· {measured(selected.cluster?.system?.cpu_usage)}%</span>
                {:else}
                  <span class="text-ink-muted">· usage not exposed</span>
                {/if}
              </span>
            </div>
            {@const tp = measured(selected.cluster?.throughput)}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">throughput</span>
              <span class="text-foreground">
                {#if tp}
                  {fmtRate(tp.requests_per_second)} <span class="text-ink-muted">· r {fmtRate(tp.reads_per_second)} / w {fmtRate(tp.writes_per_second)}</span>
                {:else}
                  <span class="text-ink-muted">not sampled</span>
                {/if}
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">avg response</span>
              <span class="text-foreground">{fmtMs(measured(selected.cluster?.latency)?.avg_response_ms)}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">uptime</span>
              <span class="text-foreground">{selected.cluster?.uptime_secs !== undefined ? uptime(Date.now() - selected.cluster.uptime_secs * 1000) : uptime(selected.stats.started_at_unix_ms)}</span>
            </div>
          {/if}
          {#if selected.replication}
            <div class="pt-2 mt-1 border-t border-muted"></div>
            {#if selected.replication.role === 'primary'}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-ink-muted">wal lsn</span>
                <span class="text-foreground">{selected.cluster?.wal?.current_lsn ?? selected.replication.wal_lsn ?? 'not exposed'}</span>
              </div>
              {#if selected.replication.commit_watermark !== undefined}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-ink-muted">commit mark</span>
                  <span class="text-foreground">{selected.replication.commit_watermark} <span class="text-ink-muted">· {selected.cluster?.replication?.commit_policy ?? ''}</span></span>
                </div>
              {/if}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-ink-muted">archive lag</span>
                <span class="text-foreground">{selected.cluster?.wal?.archive_lag_records ?? 'not exposed'} <span class="text-ink-muted">records</span></span>
              </div>
              {#if (selected.replication.full_resync_count ?? 0) > 0 || (selected.replication.partial_resync_count ?? 0) > 0}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-ink-muted">resyncs</span>
                  <span class="text-foreground">{selected.replication.full_resync_count ?? 0} full <span class="text-ink-muted">/ {selected.replication.partial_resync_count ?? 0} partial</span></span>
                </div>
              {/if}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-ink-muted">replicas</span>
                <span class="text-foreground">{selected.replication.replica_count ?? selected.cluster?.replication?.replica_count ?? 0}</span>
              </div>
              {#if selected.replication.replicas?.length}
                <div class="grid gap-1 pl-1">
                  {#each selected.replication.replicas as r (r.id)}
                    <div class="flex items-center gap-2 text-[10px]">
                      <span class={[
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        r.lag_seconds === 0 ? 'bg-role-replica' : r.lag_seconds < 5 ? 'bg-amber-400' : 'bg-primary',
                      ].join(' ')}></span>
                      <span class="text-foreground flex-1 truncate">{r.id}{#if r.rebootstrapping} <span class="text-amber-400">↻</span>{/if}</span>
                      <span class="text-ink-muted">{r.lag_lsn} lsn</span>
                      <span class={r.lag_seconds === 0 ? 'text-role-replica' : 'text-foreground'}>{r.lag_seconds === 0 ? '✓ sync' : fmtLagSeconds(r.lag_seconds)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else if selected.replication.role === 'replica'}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-ink-muted">primary</span>
                <span class="text-foreground break-all">{selected.replication.primary_addr ?? selected.replication.leader ?? 'unknown'}</span>
              </div>
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-ink-muted">applied</span>
                <span class="text-foreground">{selected.replication.last_applied_lsn} <span class="text-ink-muted">/ {selected.replication.last_seen_primary_lsn}</span></span>
              </div>
              {@const lag = replicaLagRecords(selected)}
              {#if lag !== null}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-ink-muted">lag</span>
                  <span>
                    {#if lag === 0}<Badge tone="success">in sync</Badge>{:else}<Badge tone="warning">{lag.toLocaleString()} lsn</Badge>{/if}
                    {#if selected.replication.state}<span class="text-ink-muted ml-1">{selected.replication.state}</span>{/if}
                  </span>
                </div>
              {/if}
              {#if selected.replication.last_error}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-ink-muted">last error</span>
                  <span class="text-primary-text break-all">{selected.replication.last_error}</span>
                </div>
              {/if}
            {/if}
          {/if}
          <div class="pt-2 mt-1 border-t border-muted"></div>
          {#if isConnectedNode}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">metalanguage</span>
              <span class="text-foreground">
                {#if meta?.username}you are <span class="text-primary-text">{meta.username}</span> <span class="text-ink-muted">· {meta.role}</span>{:else if meta?.error}<span class="text-ink-muted">{meta.error}</span>{:else}<span class="text-ink-muted">…</span>{/if}
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-start">
              <span class="text-ink-muted"></span>
              <span class="flex flex-wrap items-center gap-1.5">
                {#if meta?.users !== undefined}<span class="rounded border border-muted px-1.5 py-0.5 text-[10px] text-foreground">{meta.users} users</span>{/if}
                {#if meta?.tenants !== undefined}<span class="rounded border border-muted px-1.5 py-0.5 text-[10px] text-foreground">{meta.tenants} tenants</span>{/if}
                {#if meta?.policyAllowed && meta?.policies !== undefined}
                  <span class="rounded border border-muted px-1.5 py-0.5 text-[10px] text-foreground">{meta.policies} policies</span>
                {:else if meta && meta.policyAllowed === false}
                  <span class="rounded border border-muted px-1.5 py-0.5 text-[10px] text-ink-muted" title="reddb did not grant policy:read to this principal">policies · no grant</span>
                {/if}
                <DSButton variant="secondary" size="sm"
                  type="button"
                  onclick={(e: MouseEvent) => router.go({ view: 'security' }, e)}

                >Security →</DSButton>
              </span>
            </div>
          {:else}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-ink-muted">metalanguage</span>
              <span class="text-ink-muted">connect to this node to inspect users · tenants · policies</span>
            </div>
          {/if}
          {#if selectedMissing.length}
            <div class="pt-2 mt-1 border-t border-muted"></div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-start">
              <span class="text-ink-muted">not exposed</span>
              <span class="flex flex-wrap gap-1">
                {#each selectedMissing as item}
                  <span class="rounded border border-muted px-1.5 py-0.5 text-[10px] text-ink-muted">{item}</span>
                {/each}
              </span>
            </div>
          {/if}
        </div>
      </Card>
    </div>
  {/if}
  </div>
{/if}
