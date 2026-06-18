<script lang="ts">
  import { SvelteFlow, Background, BackgroundVariant, Controls, type Node, type Edge } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { Badge, Card, NodeBadge } from '@reddb-io/ui-kit'
  import EmptyState from '$lib/EmptyState.svelte'
  import ClusterNode from '$lib/ClusterNode.svelte'
  import { PRESETS, connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import { activity } from '$lib/activity.svelte'
  import { theme } from '$lib/theme.svelte'
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
  import { Lock, ServerCrash } from 'lucide-svelte'

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
  const clusterSkeletonNodes = [
    { id: 'primary', x: '50%', y: '38%', role: 'primary', label: 92 },
    { id: 'replica', x: '68%', y: '54%', role: 'replica', label: 112 },
    { id: 'embedded', x: '32%', y: '54%', role: 'embedded', label: 104 },
  ]
  const clusterSkeletonRows = Array.from({ length: 3 }, (_, i) => i)
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

  type Tone = 'neutral' | 'ok' | 'info' | 'warn' | 'danger' | 'accent'

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
        return 'accent'
      case 'embedded':
        return 'ok'
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
          tone: worst === 0 ? 'ok' : worst < 5 ? 'warn' : 'danger',
          sub: `${replicas.length} replica${replicas.length === 1 ? '' : 's'} · worst case`,
        }
      }
      const lag = replicaLagRecords(node)
      return {
        label: 'replica lag',
        value: lag === null ? 'not exposed' : lag === 0 ? '✓ in sync' : `${lag.toLocaleString()} lsn`,
        tone: lag === null ? 'neutral' : lag === 0 ? 'ok' : 'warn',
        sub: node.replication?.state,
      }
    }
    if (topo === 'serverless') {
      const boot = bootDurationMs(node.cluster)
      return {
        label: 'boot time',
        value: fmtDuration(boot),
        tone: boot === null ? 'neutral' : boot < 1000 ? 'ok' : boot < 5000 ? 'info' : 'warn',
        sub: node.cluster?.phase ? `phase · ${node.cluster.phase}` : undefined,
      }
    }
    if (topo === 'embedded') {
      const size = measured(node.cluster?.storage?.db_size_bytes)
      return {
        label: 'on-disk size',
        value: size === undefined ? 'not exposed' : fmtBytes(size),
        tone: size === undefined ? 'neutral' : 'ok',
        sub: `${(node.stats?.store.total_entities ?? 0).toLocaleString()} entities`,
      }
    }
    const size = measured(node.cluster?.storage?.db_size_bytes)
    return {
      label: 'entities',
      value: (node.stats?.store.total_entities ?? 0).toLocaleString(),
      tone: 'accent',
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
  <div class="absolute inset-0 overflow-hidden bg-bg-0" aria-busy="true" aria-label="Loading cluster topology">
    <div class="absolute inset-0 cluster-skeleton-grid"></div>

    <svg class="absolute inset-0 h-full w-full" aria-hidden="true">
      <line x1="50%" y1="38%" x2="32%" y2="54%" class="cluster-skeleton-edge motion-safe:animate-pulse" />
      <line x1="50%" y1="38%" x2="68%" y2="54%" class="cluster-skeleton-edge motion-safe:animate-pulse" />
    </svg>

    {#each clusterSkeletonNodes as node (node.id)}
      <div
        class="absolute w-[220px] rounded border border-line-2 bg-bg-1 p-3 shadow-md motion-safe:animate-pulse"
        style={`left: ${node.x}; top: ${node.y}; transform: translate(-50%, -50%);`}
      >
        <div class="mb-3 flex items-center gap-2">
          <div class={[
            'h-2 w-2 rounded-full',
            node.role === 'primary' ? 'bg-role-primary' : node.role === 'replica' ? 'bg-role-replica' : 'bg-role-embedded',
          ].join(' ')}></div>
          <div class="h-3 rounded bg-bg-3" style={`width: ${node.label}px`}></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="h-9 rounded border border-line-1 bg-bg-2"></div>
          <div class="h-9 rounded border border-line-1 bg-bg-2"></div>
        </div>
      </div>
    {/each}

    <div class="absolute top-4 left-4 z-10 w-64 rounded border border-line-2 bg-bg-1 p-3 shadow-md">
      <div class="mb-3 h-3 w-16 rounded bg-bg-2 motion-safe:animate-pulse"></div>
      <div class="mb-3 grid grid-cols-2 gap-3 border-b border-line-1 pb-3">
        <div>
          <div class="mb-2 h-3 w-16 rounded bg-bg-2 motion-safe:animate-pulse"></div>
          <div class="h-6 w-12 rounded bg-bg-2 motion-safe:animate-pulse"></div>
        </div>
        <div>
          <div class="mb-2 h-3 w-14 rounded bg-bg-2 motion-safe:animate-pulse"></div>
          <div class="h-6 w-20 rounded bg-bg-2 motion-safe:animate-pulse"></div>
        </div>
      </div>
      <div class="grid gap-1">
        {#each clusterSkeletonRows as row (row)}
          <div class="flex h-[30px] items-center gap-2.5 rounded px-2">
            <div class="h-1.5 w-1.5 rounded-full bg-bg-2 motion-safe:animate-pulse"></div>
            <div class="h-3 flex-1 rounded bg-bg-2 motion-safe:animate-pulse"></div>
            <div class="h-3 rounded bg-bg-2 motion-safe:animate-pulse" style={`width: ${row === 0 ? 36 : 24}px`}></div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{:else if secureStore.locked}
  <div class="p-6">
    <EmptyState
      icon={Lock}
      title="Locked"
      message="Unlock the secure store to probe configured nodes. Automatic probes are paused until you authenticate this session."
    />
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
          {#if selectedHero}
            <div class="mb-1 rounded border border-line-1 bg-bg-2 p-3">
              <div class="type-label">{selectedHero.label}</div>
              <div class={[
                'font-mono text-[22px] font-semibold mt-0.5 leading-none',
                selectedHero.tone === 'ok' ? 'text-role-replica' : selectedHero.tone === 'warn' ? 'text-amber-400' : selectedHero.tone === 'danger' ? 'text-accent' : selectedHero.tone === 'accent' ? 'text-accent' : 'text-fg-0',
              ].join(' ')}>{selectedHero.value}</div>
              {#if selectedHero.sub}<div class="text-[10px] text-fg-3 mt-1">{selectedHero.sub}</div>{/if}
            </div>
          {/if}
          <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
            <span class="text-fg-3">topology</span>
            <span><Badge tone={deploymentTone(selected)}>{TOPOLOGY_LABEL[selectedTopology]}</Badge></span>
          </div>
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
            {@const totalMem = measured(selected.cluster?.system?.total_memory_bytes) ?? selected.stats.system.total_memory_bytes}
            {@const availMem = measured(selected.cluster?.system?.available_memory_bytes) ?? selected.stats.system.available_memory_bytes}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">ram</span>
              <span class="text-fg-0">
                {fmtBytes(totalMem - availMem)} used
                <span class="text-fg-3">/ {fmtBytes(totalMem)} ({fmtPct(totalMem - availMem, totalMem)})</span>
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">cpu</span>
              <span class="text-fg-0">
                {selected.stats.system.cpu_cores} cores
                {#if measured(selected.cluster?.system?.cpu_usage) !== undefined}
                  <span class="text-fg-3">· {measured(selected.cluster?.system?.cpu_usage)}%</span>
                {:else}
                  <span class="text-fg-3">· usage not exposed</span>
                {/if}
              </span>
            </div>
            {@const tp = measured(selected.cluster?.throughput)}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">throughput</span>
              <span class="text-fg-0">
                {#if tp}
                  {fmtRate(tp.requests_per_second)} <span class="text-fg-3">· r {fmtRate(tp.reads_per_second)} / w {fmtRate(tp.writes_per_second)}</span>
                {:else}
                  <span class="text-fg-3">not sampled</span>
                {/if}
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">avg response</span>
              <span class="text-fg-0">{fmtMs(measured(selected.cluster?.latency)?.avg_response_ms)}</span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">uptime</span>
              <span class="text-fg-0">{selected.cluster?.uptime_secs !== undefined ? uptime(Date.now() - selected.cluster.uptime_secs * 1000) : uptime(selected.stats.started_at_unix_ms)}</span>
            </div>
          {/if}
          {#if selected.replication}
            <div class="pt-2 mt-1 border-t border-line-1"></div>
            {#if selected.replication.role === 'primary'}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">wal lsn</span>
                <span class="text-fg-0">{selected.cluster?.wal?.current_lsn ?? selected.replication.wal_lsn ?? 'not exposed'}</span>
              </div>
              {#if selected.replication.commit_watermark !== undefined}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-fg-3">commit mark</span>
                  <span class="text-fg-0">{selected.replication.commit_watermark} <span class="text-fg-3">· {selected.cluster?.replication?.commit_policy ?? ''}</span></span>
                </div>
              {/if}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">archive lag</span>
                <span class="text-fg-0">{selected.cluster?.wal?.archive_lag_records ?? 'not exposed'} <span class="text-fg-3">records</span></span>
              </div>
              {#if (selected.replication.full_resync_count ?? 0) > 0 || (selected.replication.partial_resync_count ?? 0) > 0}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-fg-3">resyncs</span>
                  <span class="text-fg-0">{selected.replication.full_resync_count ?? 0} full <span class="text-fg-3">/ {selected.replication.partial_resync_count ?? 0} partial</span></span>
                </div>
              {/if}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">replicas</span>
                <span class="text-fg-0">{selected.replication.replica_count ?? selected.cluster?.replication?.replica_count ?? 0}</span>
              </div>
              {#if selected.replication.replicas?.length}
                <div class="grid gap-1 pl-1">
                  {#each selected.replication.replicas as r (r.id)}
                    <div class="flex items-center gap-2 text-[10px]">
                      <span class={[
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        r.lag_seconds === 0 ? 'bg-role-replica' : r.lag_seconds < 5 ? 'bg-amber-400' : 'bg-accent',
                      ].join(' ')}></span>
                      <span class="text-fg-1 flex-1 truncate">{r.id}{#if r.rebootstrapping} <span class="text-amber-400">↻</span>{/if}</span>
                      <span class="text-fg-3">{r.lag_lsn} lsn</span>
                      <span class={r.lag_seconds === 0 ? 'text-role-replica' : 'text-fg-0'}>{r.lag_seconds === 0 ? '✓ sync' : fmtLagSeconds(r.lag_seconds)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else if selected.replication.role === 'replica'}
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">primary</span>
                <span class="text-fg-0 break-all">{selected.replication.primary_addr ?? selected.replication.leader ?? 'unknown'}</span>
              </div>
              <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                <span class="text-fg-3">applied</span>
                <span class="text-fg-0">{selected.replication.last_applied_lsn} <span class="text-fg-3">/ {selected.replication.last_seen_primary_lsn}</span></span>
              </div>
              {@const lag = replicaLagRecords(selected)}
              {#if lag !== null}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-fg-3">lag</span>
                  <span>
                    {#if lag === 0}<Badge tone="ok">in sync</Badge>{:else}<Badge tone="warn">{lag.toLocaleString()} lsn</Badge>{/if}
                    {#if selected.replication.state}<span class="text-fg-3 ml-1">{selected.replication.state}</span>{/if}
                  </span>
                </div>
              {/if}
              {#if selected.replication.last_error}
                <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
                  <span class="text-fg-3">last error</span>
                  <span class="text-accent break-all">{selected.replication.last_error}</span>
                </div>
              {/if}
            {/if}
          {/if}
          <div class="pt-2 mt-1 border-t border-line-1"></div>
          {#if isConnectedNode}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">metalanguage</span>
              <span class="text-fg-0">
                {#if meta?.username}you are <span class="text-accent">{meta.username}</span> <span class="text-fg-3">· {meta.role}</span>{:else if meta?.error}<span class="text-fg-3">{meta.error}</span>{:else}<span class="text-fg-3">…</span>{/if}
              </span>
            </div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-start">
              <span class="text-fg-3"></span>
              <span class="flex flex-wrap items-center gap-1.5">
                {#if meta?.users !== undefined}<span class="rounded border border-line-1 px-1.5 py-0.5 text-[10px] text-fg-1">{meta.users} users</span>{/if}
                {#if meta?.tenants !== undefined}<span class="rounded border border-line-1 px-1.5 py-0.5 text-[10px] text-fg-1">{meta.tenants} tenants</span>{/if}
                {#if meta?.policyAllowed && meta?.policies !== undefined}
                  <span class="rounded border border-line-1 px-1.5 py-0.5 text-[10px] text-fg-1">{meta.policies} policies</span>
                {:else if meta && meta.policyAllowed === false}
                  <span class="rounded border border-line-1 px-1.5 py-0.5 text-[10px] text-fg-3" title="reddb did not grant policy:read to this principal">policies · no grant</span>
                {/if}
                <button
                  type="button"
                  onclick={(e) => router.go({ view: 'security' }, e)}
                  class="rounded border border-line-2 bg-bg-2 px-1.5 py-0.5 text-[10px] text-fg-1 hover:border-line-3 hover:text-fg-0"
                >Security →</button>
              </span>
            </div>
          {:else}
            <div class="grid grid-cols-[120px_1fr] gap-3 items-baseline">
              <span class="text-fg-3">metalanguage</span>
              <span class="text-fg-3">connect to this node to inspect users · tenants · policies</span>
            </div>
          {/if}
          {#if selectedMissing.length}
            <div class="pt-2 mt-1 border-t border-line-1"></div>
            <div class="grid grid-cols-[120px_1fr] gap-3 items-start">
              <span class="text-fg-3">not exposed</span>
              <span class="flex flex-wrap gap-1">
                {#each selectedMissing as item}
                  <span class="rounded border border-line-1 px-1.5 py-0.5 text-[10px] text-fg-3">{item}</span>
                {/each}
              </span>
            </div>
          {/if}
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
  .cluster-skeleton-grid {
    background-image: radial-gradient(var(--color-line-2) 1px, transparent 1px);
    background-size: 32px 32px;
    opacity: 0.55;
  }
  .cluster-skeleton-edge {
    stroke: var(--color-line-2);
    stroke-width: 1.5;
    stroke-linecap: round;
    opacity: 0.7;
  }
</style>
