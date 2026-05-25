<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { Badge, Card } from '@red-ui/ui-kit'
  import { graph } from '$lib/fixtures'
  import PageHeader from '$lib/PageHeader.svelte'

  const typeColor: Record<string, string> = {
    User: '#60a5fa',
    Project: '#ff2056',
    Org: '#4ade80',
  }

  let nodes = $state.raw<Node[]>(
    graph.nodes.map((n, i) => ({
      id: n.id,
      position: {
        x: 120 + (i % 4) * 200,
        y: 80 + Math.floor(i / 4) * 180,
      },
      data: { label: `${n.label}` },
      style: `background:${typeColor[n.type] ?? '#7a8088'};color:white;border-radius:9999px;padding:10px 16px;font-family:JetBrains Mono;font-size:11px;border:1px solid ${typeColor[n.type]};box-shadow:0 0 0 4px color-mix(in srgb, ${typeColor[n.type]} 18%, transparent);`,
    })),
  )

  let edges = $state.raw<Edge[]>(
    graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      labelStyle: 'fill:#c8ccd4;font-family:JetBrains Mono;font-size:10px;',
      labelBgStyle: 'fill:#14171c;',
      style: 'stroke:#262a31;stroke-width:1.2',
    })),
  )

  let selectedId = $state<string | null>('u:1')
  const selected = $derived(graph.nodes.find((n) => n.id === selectedId))

  let cypher = $state('MATCH (u:User)-[:OWNS]->(p:Project) RETURN u, p')

  function onnodeclick(_e: unknown, n?: { id: string }) {
    if (n) selectedId = n.id
  }
</script>

<PageHeader
  eyebrow="Explore"
  title="Graphs"
  subtitle="Click a node to inspect its properties and walk relationships interactively"
/>

<div class="layout">
  <section class="canvas">
    <Card>
      <div class="query-bar">
        <span class="prompt">$</span>
        <input bind:value={cypher} spellcheck="false" />
        <button class="run">Run</button>
      </div>
    </Card>

    <div class="flow">
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

    <div class="legend">
      {#each Object.entries(typeColor) as [type, color]}
        <span class="leg"><span class="dot" style="background:{color}"></span> {type}</span>
      {/each}
    </div>
  </section>

  <aside class="inspector">
    {#if selected}
      <Card title="node · {selected.id}">
        <div class="node-head">
          <Badge tone="info">{selected.type}</Badge>
          <span class="label">{selected.label}</span>
        </div>
        <div class="props">
          {#each Object.entries(selected.props) as [k, v]}
            <div class="prop">
              <span class="k">{k}</span>
              <span class="v">{String(v)}</span>
            </div>
          {/each}
        </div>
        <div class="rels">
          <div class="rels-label">Relationships</div>
          {#each graph.edges.filter((e) => e.source === selected.id || e.target === selected.id) as e}
            {@const other = e.source === selected.id ? graph.nodes.find((n) => n.id === e.target) : graph.nodes.find((n) => n.id === e.source)}
            {@const dir = e.source === selected.id ? '→' : '←'}
            <button class="rel" onclick={() => (selectedId = other?.id ?? null)}>
              <span class="rel-dir">{dir}</span>
              <span class="rel-label">{e.label}</span>
              <span class="rel-target">{other?.label}</span>
            </button>
          {/each}
        </div>
      </Card>
    {/if}
  </aside>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 16px;
    height: 100%;
  }
  .canvas { display: grid; grid-template-rows: auto 1fr auto; gap: 12px; min-width: 0; }

  .query-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
  }
  .prompt { color: var(--accent); font-weight: 700; }
  .query-bar input {
    flex: 1;
    background: transparent;
    border: 0;
    color: var(--fg-0);
    font: inherit;
    font-size: 13px;
    outline: 0;
  }
  .run {
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    color: var(--fg-1);
    border-radius: var(--r-md);
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .run:hover { background: var(--bg-3); color: var(--fg-0); }

  .flow {
    background: var(--bg-1);
    border: 1px solid var(--line-1);
    border-radius: var(--r-lg);
    overflow: hidden;
    min-height: 0;
  }
  :global(.svelte-flow) { background: transparent !important; }

  .legend { display: flex; gap: 14px; font-size: 11px; color: var(--fg-2); }
  .leg { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); }
  .dot { width: 8px; height: 8px; border-radius: 9999px; }

  .inspector { align-self: start; }
  .node-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .label { font-family: var(--font-mono); font-size: 13px; color: var(--fg-0); }
  .props { display: grid; gap: 4px; padding: 8px 0; border-top: 1px solid var(--line-1); }
  .prop { display: grid; grid-template-columns: 80px 1fr; gap: 8px; font-size: 11px; }
  .k { color: var(--fg-3); font-family: var(--font-mono); }
  .v { color: var(--fg-1); font-family: var(--font-mono); }
  .rels { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line-1); }
  .rels-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3); margin-bottom: 8px; }
  .rel {
    display: grid;
    grid-template-columns: 16px auto 1fr;
    gap: 6px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 6px 8px;
    border-radius: var(--r-sm);
    cursor: pointer;
    color: var(--fg-1);
    font-size: 11px;
    font-family: var(--font-mono);
  }
  .rel:hover { background: var(--bg-2); }
  .rel-dir { color: var(--accent); font-weight: 700; }
  .rel-label { color: var(--info); }
  .rel-target { color: var(--fg-0); overflow: hidden; text-overflow: ellipsis; }
</style>
