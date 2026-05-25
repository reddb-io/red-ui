<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { Card, Badge, Button, NodeBadge } from '@red-ui/ui-kit'

  const nodes = $state.raw<Node[]>([
    {
      id: 'p1',
      type: 'default',
      position: { x: 380, y: 80 },
      data: { label: 'primary · 12.4 GB · 1.2M keys' },
      style: 'background:#ff2056;color:white;border-radius:10px;padding:10px 14px;border:1px solid #ff2056;box-shadow:0 0 0 4px rgba(255,32,86,0.18);font-family:JetBrains Mono;font-size:11px;',
    },
    { id: 'r1', position: { x: 120, y: 260 }, data: { label: 'replica-1 · lag 2KB · 12 GB' }, style: 'background:#1c2027;color:#c8ccd4;border:1px solid #60a5fa;border-radius:10px;padding:10px 14px;font-family:JetBrains Mono;font-size:11px;' },
    { id: 'r2', position: { x: 380, y: 280 }, data: { label: 'replica-2 · lag 5KB · 12 GB' }, style: 'background:#1c2027;color:#c8ccd4;border:1px solid #60a5fa;border-radius:10px;padding:10px 14px;font-family:JetBrains Mono;font-size:11px;' },
    { id: 'r3', position: { x: 640, y: 260 }, data: { label: 'replica-3 · lag 1KB · 12 GB' }, style: 'background:#1c2027;color:#c8ccd4;border:1px solid #60a5fa;border-radius:10px;padding:10px 14px;font-family:JetBrains Mono;font-size:11px;' },
  ])
  const edges = $state.raw<Edge[]>([
    { id: 'p1-r1', source: 'p1', target: 'r1', animated: true, style: 'stroke:#60a5fa;stroke-width:1.4' },
    { id: 'p1-r2', source: 'p1', target: 'r2', animated: true, style: 'stroke:#60a5fa;stroke-width:1.4' },
    { id: 'p1-r3', source: 'p1', target: 'r3', animated: true, style: 'stroke:#60a5fa;stroke-width:1.4' },
  ])

  let selectedNode = $state<string | null>('p1')
</script>

<div class="canvas">
  <SvelteFlow
    {nodes}
    {edges}
    fitView
    fitViewOptions={{ padding: 0.2 }}
    proOptions={{ hideAttribution: true }}
    onnodeclick={(e) => (selectedNode = e.node.id)}
  >
    <Background bgColor="transparent" patternColor="#1c2027" gap={28} />
    <Controls position="bottom-right" />
  </SvelteFlow>
</div>

<!-- Floating inspector panel -->
<aside class="inspector">
  <Card title="node · {selectedNode}" floating>
    <div class="meta">
      <div class="row"><span>role</span><NodeBadge role="primary" /></div>
      <div class="row"><span>host</span><code>localhost:6379</code></div>
      <div class="row"><span>uptime</span><code>3d 14h 22m</code></div>
      <div class="row"><span>size</span><code>12.4 GB</code> <Badge tone="ok">healthy</Badge></div>
      <div class="row"><span>keys</span><code>1,234,567</code></div>
      <div class="row"><span>ops/s</span><code>4.2K</code></div>
    </div>
    <div class="actions">
      <Button size="sm" variant="primary">Inspect data</Button>
      <Button size="sm">Stats</Button>
    </div>
  </Card>
</aside>

<style>
  .canvas {
    position: absolute;
    inset: 0;
  }
  :global(.svelte-flow) { background: transparent !important; }
  :global(.svelte-flow__controls button) {
    background: var(--bg-2) !important;
    border: 1px solid var(--line-2) !important;
    color: var(--fg-1) !important;
  }

  .inspector {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 280px;
    z-index: 5;
  }
  .meta { display: grid; gap: 6px; font-size: 12px; }
  .row {
    display: grid;
    grid-template-columns: 60px 1fr auto;
    align-items: center;
    gap: 8px;
  }
  .row > span:first-child {
    color: var(--fg-3);
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  code {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--fg-0);
  }
  .actions {
    display: flex;
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line-1);
  }
</style>
