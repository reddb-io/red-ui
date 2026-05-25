<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { Badge, Card } from '@red-ui/ui-kit'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { connection } from '$lib/connections.svelte'
  import { Network } from 'lucide-svelte'

  let nodes = $state.raw<Node[]>([])
  let edges = $state.raw<Edge[]>([])
  let nodeProps = $state<Record<string, Record<string, unknown>>>({})
  let edgeLabels = $state<Record<string, string>>({})
  let selectedId = $state<string | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)

  const typeColor: Record<string, string> = {
    User: '#60a5fa',
    Project: '#ff2056',
    Org: '#4ade80',
    default: '#7a8088',
  }
  function styleFor(type: string) {
    const c = typeColor[type] ?? typeColor.default
    return `background:${c};color:white;border-radius:9999px;padding:10px 16px;font-family:JetBrains Mono Variable;font-size:11px;border:1px solid ${c};box-shadow:0 0 0 4px color-mix(in srgb, ${c} 18%, transparent);`
  }

  $effect(() => {
    if (!connection.probe.reachable) { nodes = []; edges = []; return }
    const client = connection.client!
    loading = true; error = null
    client.query('MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100').then((res) => {
      const rec = (res.result.records ?? []) as any[]
      const seen = new Set<string>()
      const ns: Node[] = []
      const es: Edge[] = []
      const props: Record<string, Record<string, unknown>> = {}
      const elabels: Record<string, string> = {}
      rec.forEach((row, i) => {
        const gnodes = (row.nodes ?? {}) as Record<string, any>
        const gedges = (row.edges ?? {}) as Record<string, any>
        Object.entries(gnodes).forEach(([_alias, gn]) => {
          const id = String((gn as any).id ?? (gn as any).rid ?? `${i}-${_alias}`)
          if (seen.has(id)) return
          seen.add(id)
          const label = (gn as any).label ?? (gn as any).name ?? id
          const type = (gn as any).type ?? 'default'
          ns.push({
            id,
            position: { x: 120 + (ns.length % 6) * 180, y: 80 + Math.floor(ns.length / 6) * 160 },
            data: { label },
            style: styleFor(type),
          })
          props[id] = (gn as any).props ?? gn
        })
        Object.entries(gedges).forEach(([alias, ge]) => {
          const eid = String((ge as any).id ?? `e-${i}-${alias}`)
          const src = String((ge as any).source ?? (ge as any).from ?? '')
          const tgt = String((ge as any).target ?? (ge as any).to ?? '')
          if (!src || !tgt) return
          es.push({ id: eid, source: src, target: tgt, label: (ge as any).label ?? alias, style: 'stroke:#262a31;stroke-width:1.2' })
          elabels[eid] = (ge as any).label ?? alias
        })
      })
      nodes = ns
      edges = es
      nodeProps = props
      edgeLabels = elabels
      if (ns.length && !selectedId) selectedId = ns[0].id
      loading = false
    }).catch((e) => { error = e.message; loading = false })
  })

  const selectedProps = $derived(selectedId ? nodeProps[selectedId] : undefined)
</script>

{#if !connection.probe.reachable}
  <PageHeader eyebrow="Explore" title="Graphs" />
  <EmptyState
    icon={Network}
    title="No connection"
    message="Connect to a reddb instance to query and visualize graph collections."
  />
{:else if loading && nodes.length === 0}
  <PageHeader eyebrow="Explore" title="Graphs" subtitle="Querying graph collections…" />
{:else if error}
  <PageHeader eyebrow="Explore" title="Graphs" />
  <EmptyState
    icon={Network}
    title="No graph data"
    message="The cluster has no graph collections, or the query returned no edges. Create a collection with graph capability and add some MATCH-able data."
    hint="Error: {error}"
  />
{:else if nodes.length === 0}
  <PageHeader eyebrow="Explore" title="Graphs" />
  <EmptyState
    icon={Network}
    title="No graph data"
    message="No nodes returned from MATCH (n)-[r]->(m). Create a graph collection and add nodes with edges to see them here."
  />
{:else}
  <PageHeader
    eyebrow="Explore"
    title="Graphs"
    subtitle="Live · {nodes.length} nodes · {edges.length} edges"
  />

  <div class="grid grid-cols-[1fr_320px] gap-4 h-[calc(100vh-180px)]">
    <div class="bg-bg-1 border border-line-1 rounded-lg overflow-hidden">
      <SvelteFlow
        {nodes}
        {edges}
        fitView
        proOptions={{ hideAttribution: true }}
        onnodeclick={(e) => (selectedId = e.node.id)}
      >
        <Background bgColor="transparent" patternColor="#1c2027" gap={28} />
        <Controls position="bottom-right" />
      </SvelteFlow>
    </div>

    {#if selectedId && selectedProps}
      <Card title="node · {selectedId}">
        <div class="grid gap-1 font-mono text-[11px]">
          {#each Object.entries(selectedProps) as [k, v]}
            <div class="grid grid-cols-[80px_1fr] gap-2">
              <span class="text-fg-3">{k}</span>
              <span class="text-fg-1 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          {/each}
        </div>
      </Card>
    {/if}
  </div>
{/if}
