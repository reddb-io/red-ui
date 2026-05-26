<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import {
    SvelteFlow,
    Background,
    Controls,
    type Node,
    type Edge,
  } from '@xyflow/svelte'
  import { extractGraph } from './graph-render'
  import '@xyflow/svelte/dist/style.css'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  const graph = $derived(extractGraph(result))

  function layout(): { nodes: Node[]; edges: Edge[] } {
    const radius = Math.max(120, graph.nodes.length * 22)
    const nodes: Node[] = graph.nodes.map((n, i) => {
      const angle = (i / Math.max(1, graph.nodes.length)) * Math.PI * 2
      return {
        id: n.id,
        type: 'default',
        position: { x: Math.cos(angle) * radius + radius, y: Math.sin(angle) * radius + radius },
        data: { label: n.label },
      } satisfies Node
    })
    const edges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: false,
    }))
    return { nodes, edges }
  }

  const laid = $derived(layout())
  // SvelteFlow expects $state-backed arrays via bind:nodes/bind:edges.
  let flowNodes = $state<Node[]>([])
  let flowEdges = $state<Edge[]>([])
  $effect(() => {
    flowNodes = laid.nodes
    flowEdges = laid.edges
  })
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if graph.nodes.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No graph shape in this result.
    </div>
  {:else}
    <div class="flex-1 min-h-0">
      <SvelteFlow bind:nodes={flowNodes} bind:edges={flowEdges} fitView>
        <Background />
        <Controls />
      </SvelteFlow>
    </div>
    <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3 flex items-center gap-3">
      <span>{graph.nodes.length} nodes · {graph.edges.length} edges</span>
      {#if collection}<span>· <span class="text-fg-2">{collection}</span></span>{/if}
    </div>
  {/if}
</div>
