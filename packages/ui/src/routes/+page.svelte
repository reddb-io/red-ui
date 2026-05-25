<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { Badge, Card, NodeBadge } from '@red-ui/ui-kit'
  import EmptyState from '$lib/EmptyState.svelte'
  import { connection, PRESETS } from '$lib/connections.svelte'
  import { RedClient, type Stats, type ReplicationStatus } from '@red-ui/protocol'
  import { ServerCrash } from 'lucide-svelte'

  interface KnownNode {
    id: string
    preset: typeof PRESETS[number]
    reachable: boolean
    role: 'primary' | 'replica' | 'standalone'
    stats?: Stats
    replication?: ReplicationStatus
  }

  let known = $state<KnownNode[]>([])
  let loading = $state(true)

  async function probeAll() {
    const results = await Promise.all(
      PRESETS.map(async (p) => {
        const client = new RedClient(p.url)
        try {
          const [stats, replication] = await Promise.all([
            client.stats(),
            client.replication().catch(() => undefined),
          ])
          return {
            id: p.id,
            preset: p,
            reachable: true,
            role: replication?.role ?? 'standalone',
            stats,
            replication,
          } as KnownNode
        } catch {
          return { id: p.id, preset: p, reachable: false, role: 'standalone' as const }
        }
      }),
    )
    known = results
    loading = false
  }

  $effect(() => {
    probeAll()
    const id = setInterval(probeAll, 5000)
    return () => clearInterval(id)
  })

  const liveNodes = $derived(known.filter((k) => k.reachable))

  // Build SvelteFlow graph from real nodes
  const flowNodes = $derived<Node[]>(
    liveNodes.map((k, i) => {
      const c = k.role === 'primary' ? '#ff2056' : k.role === 'replica' ? '#60a5fa' : '#4ade80'
      const sub = k.stats
        ? `${k.stats.store.collection_count} colls · ${k.stats.store.total_entities.toLocaleString()} ents`
        : ''
      return {
        id: k.id,
        position: { x: 200 + (i % 3) * 240, y: 100 + Math.floor(i / 3) * 200 },
        data: { label: `${k.preset.label}\n${sub}` },
        style: `background:${c};color:white;border-radius:10px;padding:10px 14px;border:1px solid ${c};box-shadow:0 0 0 4px color-mix(in srgb, ${c} 18%, transparent);font-family:JetBrains Mono Variable;font-size:11px;white-space:pre-line;text-align:center;min-width:160px;`,
      }
    }),
  )

  const flowEdges = $derived<Edge[]>(
    liveNodes
      .filter((k) => k.role === 'replica' && k.replication?.primary_addr)
      .map((replica) => {
        // Find which known primary that addr resolves to (best-effort by port match)
        const primary = liveNodes.find((p) => p.role === 'primary')
        if (!primary) return null
        return {
          id: `${primary.id}-${replica.id}`,
          source: primary.id,
          target: replica.id,
          animated: true,
          style: 'stroke:#60a5fa;stroke-width:1.4',
          label: replica.replication?.last_applied_lsn !== undefined && replica.replication?.last_seen_primary_lsn !== undefined
            ? (replica.replication.last_seen_primary_lsn - replica.replication.last_applied_lsn === 0
                ? '✓ in sync'
                : `lag ${replica.replication.last_seen_primary_lsn - replica.replication.last_applied_lsn}`)
            : '',
          labelStyle: 'fill:#c8ccd4;font-family:JetBrains Mono Variable;font-size:10px',
          labelBgStyle: 'fill:#14171c',
        } as Edge
      })
      .filter((e): e is Edge => e !== null),
  )

  let selectedId = $state<string | null>(null)
  const selected = $derived(known.find((k) => k.id === selectedId))
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
      message="None of the configured reddb endpoints responded. Start one and the topology will populate automatically (auto-refreshes every 5s)."
      hint="docker compose -f docker/compose.yml up -d"
    />
    <div class="grid gap-2 mt-6 max-w-md mx-auto font-mono text-[11px]">
      {#each known as k}
        <div class="flex items-center justify-between bg-bg-1 border border-line-1 rounded px-3 py-2">
          <span class="text-fg-1">{k.preset.label}</span>
          <code class="text-fg-3">{k.preset.url}</code>
          <Badge tone="danger">unreachable</Badge>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <div class="absolute inset-0">
    <SvelteFlow
      nodes={flowNodes}
      edges={flowEdges}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
      onnodeclick={(e) => (selectedId = e.node.id)}
    >
      <Background bgColor="transparent" patternColor="#1c2027" gap={28} />
      <Controls position="bottom-right" />
    </SvelteFlow>
  </div>

  <!-- Floating summary -->
  <div class="absolute top-4 left-4 z-10 w-72">
    <Card title="cluster">
      <div class="grid gap-1.5 font-mono text-[11px]">
        {#each liveNodes as k}
          <button
            class="grid grid-cols-[auto_1fr_auto] gap-2 items-center px-2 py-1.5 rounded text-left bg-transparent border-0 cursor-pointer hover:bg-bg-2 {selectedId === k.id ? 'bg-bg-2' : ''}"
            onclick={() => (selectedId = k.id)}
          >
            <NodeBadge role={k.role === 'primary' ? 'primary' : k.role === 'replica' ? 'replica' : 'embedded'} label={k.role} />
            <code class="text-fg-1 truncate">{k.preset.label}</code>
            <code class="text-fg-3 text-[10px]">{k.stats?.store.total_entities ?? 0}</code>
          </button>
        {/each}
      </div>
      <div class="mt-3 pt-3 border-t border-line-1 grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div>
          <div class="type-label">reachable</div>
          <div class="text-fg-0 mt-0.5">{liveNodes.length} of {known.length}</div>
        </div>
        <div>
          <div class="type-label">entities</div>
          <div class="text-accent mt-0.5">{liveNodes.reduce((s, k) => s + (k.stats?.store.total_entities ?? 0), 0).toLocaleString()}</div>
        </div>
      </div>
    </Card>
  </div>

  <!-- Inspector -->
  {#if selected}
    <div class="absolute top-4 right-4 z-10 w-80">
      <Card title="node · {selected.id}" floating>
        <div class="grid gap-1.5 font-mono text-[11px]">
          <div class="grid grid-cols-[70px_1fr] gap-2">
            <span class="text-fg-3">label</span><code class="text-fg-0">{selected.preset.label}</code>
          </div>
          <div class="grid grid-cols-[70px_1fr] gap-2">
            <span class="text-fg-3">url</span><code class="text-fg-0 break-all">{selected.preset.url}</code>
          </div>
          <div class="grid grid-cols-[70px_1fr] gap-2">
            <span class="text-fg-3">role</span>
            <span><NodeBadge role={selected.role === 'primary' ? 'primary' : selected.role === 'replica' ? 'replica' : 'embedded'} label={selected.role} /></span>
          </div>
          {#if selected.stats}
            <div class="grid grid-cols-[70px_1fr] gap-2">
              <span class="text-fg-3">collections</span><code class="text-fg-0">{selected.stats.store.collection_count}</code>
            </div>
            <div class="grid grid-cols-[70px_1fr] gap-2">
              <span class="text-fg-3">entities</span><code class="text-accent">{selected.stats.store.total_entities.toLocaleString()}</code>
            </div>
            <div class="grid grid-cols-[70px_1fr] gap-2">
              <span class="text-fg-3">uptime</span><code class="text-fg-0">{Math.round((Date.now() - selected.stats.started_at_unix_ms) / 1000)}s</code>
            </div>
          {/if}
          {#if selected.replication}
            {#if selected.replication.role === 'primary'}
              <div class="grid grid-cols-[70px_1fr] gap-2">
                <span class="text-fg-3">wal lsn</span><code class="text-fg-0">{selected.replication.wal_lsn}</code>
              </div>
              <div class="grid grid-cols-[70px_1fr] gap-2">
                <span class="text-fg-3">replicas</span><code class="text-fg-0">{selected.replication.replica_count}</code>
              </div>
            {:else if selected.replication.role === 'replica'}
              <div class="grid grid-cols-[70px_1fr] gap-2">
                <span class="text-fg-3">lsn</span><code class="text-fg-0">{selected.replication.last_applied_lsn} / {selected.replication.last_seen_primary_lsn}</code>
              </div>
            {/if}
          {/if}
        </div>
      </Card>
    </div>
  {/if}
{/if}
