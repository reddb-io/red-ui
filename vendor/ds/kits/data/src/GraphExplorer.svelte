<script lang="ts">
  import { untrack } from "svelte";
  import {
    Button,
    Input,
    Textarea,
    Checkbox,
    Link,
    EmptyState,
    StateIllustration,
    quietControl,
  } from "@reddb-io/design-system/base";
  import {
    graphEmptyCompact,
    searchEmpty,
  } from "@reddb-io/design-system/base/illustrations";
  import Graph from "./Graph.svelte";
  import Table from "./Table.svelte";
  import {
    shapeGraphData,
    detectGraphCommunities,
    type GraphInteraction,
  } from "./graph";
  import {
    filterExplorerGraph,
    explorerGraphData,
    graphExplorerTypes,
    graphExplorerNodeType,
    graphNodeDetail,
    graphNodeCentrality,
    type GraphData,
    type GraphQueryRequest,
  } from "./graph-explorer";
  import { explorerClasses as styles } from "./diff-explorer.variants";
  import type { GraphExplorerContract } from "./core/contracts/graphexplorer";
  interface Props extends GraphExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let {
    label,
    data,
    context,
    error,
    emptyReason = "empty",
    recoveryHref,
    recoveryLabel = "Inspect data",
    initialView = "canvas",
    onquery,
    nodehref,
    class: className = "",
  }: Props = $props();
  let view = $state(untrack(() => initialView)),
    filter = $state(""),
    hidden = $state<Set<string>>(new Set()),
    limit = $state(25000),
    budget = $state(350),
    grouped = $state(false),
    bundled = $state(false),
    collapsed = $state<readonly string[]>([]);
  let selected = $state<GraphInteraction | null>(null),
    focus = $state<string | null>(null),
    override = $state<GraphData | null>(null),
    queryOpen = $state(false),
    draft = $state(""),
    from = $state(""),
    to = $state(""),
    busy = $state(false),
    failure = $state<string | null>(null),
    input = $state<HTMLInputElement>();
  let controller: AbortController | undefined;
  $effect(() => {
    void data;
    void context;
    controller?.abort();
    override = null;
    selected = null;
    focus = null;
    failure = null;
    busy = false;
    collapsed = [];
    return () => controller?.abort();
  });
  const active = $derived(override ?? data),
    types = $derived(graphExplorerTypes(active)),
    filtered = $derived(filterExplorerGraph(active, filter, hidden, limit));
  $effect(() => {
    const count = filtered.nodes.length;
    let frame = 0,
      disposed = false;
    budget = Math.min(350, count);
    function grow() {
      if (disposed) return;
      budget = Math.min(budget + 400, count);
      if (budget < count) frame = requestAnimationFrame(grow);
    }
    if (budget < count) frame = requestAnimationFrame(grow);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  });
  const drawing = $derived(
    filterExplorerGraph(filtered, "", new Set(), budget),
  );
  const canonical = $derived(
    detectGraphCommunities(shapeGraphData(explorerGraphData(drawing))),
  );
  const graphData = $derived({
    nodes: canonical.nodes.map((node) => ({
      ...node,
      community: node.community,
    })),
    edges: canonical.edges,
  });
  const communities = $derived([
    ...new Set(canonical.nodes.map((node) => node.community)),
  ]);
  const node = $derived(
      selected?.kind === "node"
        ? filtered.nodes.find((node) => node.id === selected?.id)
        : undefined,
    ),
    edge = $derived(
      selected?.kind === "edge"
        ? filtered.edges.find((edge) => edge.id === selected?.id)
        : undefined,
    );
  const selectedCommunity = $derived(canonical.nodes.find(entry => entry.id === node?.id)?.community);
  const canCollapse = $derived(selectedCommunity !== undefined && canonical.nodes.filter(entry => entry.community === selectedCommunity).length > 1);
  const href = $derived(node ? nodehref?.(node) : undefined);
  const centrality = $derived(graphNodeCentrality(active.nodes, active.edges));
  const detail = $derived(
      node
        ? graphNodeDetail(node, active.nodes, active.edges, centrality)
        : undefined,
    );
  const tableRows = $derived(
    filtered.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: graphExplorerNodeType(node),
      degree: centrality.get(node.id)?.degree ?? 0,
      score: centrality.get(node.id)?.score ?? 0,
    })),
  );
  function clear() {
    filter = "";
    hidden = new Set();
    input?.focus();
  }
  function select(event: GraphInteraction) {
    selected = event;
    if (event.kind === "node") focus = event.id;
  }
  async function run(request: GraphQueryRequest) {
    if (!onquery || busy) return;
    controller?.abort();
    const task = new AbortController();
    controller = task;
    busy = true;
    failure = null;
    try {
      const next = await onquery(request, task.signal);
      if (!task.signal.aborted) {
        override = next;
        selected = null;
        focus = null;
        collapsed = [];
      }
    } catch (cause) {
      if (!task.signal.aborted)
        failure = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (controller === task && !task.signal.aborted) busy = false;
    }
  }
  function reset() {
    controller?.abort();
    override = null;
    selected = null;
    focus = null;
    failure = null;
    busy = false;
    collapsed = [];
    draft = "";
  }
</script>

<section
  data-graph-explorer
  aria-label={label}
  class={`@container ${styles.root} ${className}`}
>
  {#if error}<p role="alert" class={styles.detail}>{error}</p>{:else}
    {#if active.summary}<p role="status" class={styles.detail}>{active.summary}</p>{/if}
    <div class={styles.toolbar}>
      {#each ["canvas", "svg", "table"] as mode}<button
          type="button"
          class={quietControl({
            selected: view === mode,
            class: "px-[var(--reddb-spatial-inset-sm)]",
          })}
          aria-pressed={view === mode}
          onclick={() => (view = mode as typeof view)}>{mode}</button
        >{/each}
      <label
        >Filter graph <Input
          aria-label="Filter graph"
          bind:value={filter}
          bind:ref={input}
        /></label
      >
      <label
        >Node limit <Input
          aria-label="Node limit"
          type="number"
          min="1"
          max="25000"
          bind:value={limit}
        /></label
      >
      {#if filter || hidden.size}<Button onclick={clear}
          >Clear graph filters</Button
        >{/if}
      <Button aria-pressed={grouped} onclick={() => (grouped = !grouped)}
        >Group communities</Button
      ><Button aria-pressed={bundled} onclick={() => (bundled = !bundled)}
        >Bundle edges</Button
      >
      <Button
        aria-pressed={collapsed.length > 0}
        onclick={() => (collapsed = collapsed.length ? [] : communities)}
        >{collapsed.length
          ? "Expand communities"
          : "Collapse communities"}</Button
      >
      {#if onquery}<Button
          aria-pressed={queryOpen}
          onclick={() => (queryOpen = !queryOpen)}>Query graph</Button
        >{/if}{#if override}<Button onclick={reset}>Reset graph</Button>{/if}
      <span
        >{filtered.nodes.length} of {active.nodes.length} nodes · {filtered
          .edges.length} edges{context ? ` · ${context}` : ""}</span
      >
    </div>
    {#if types.length > 1}<div class={styles.toolbar}>
        {#each types as type}<Checkbox
            label={type}
            checked={!hidden.has(type)}
            oncheckedchange={(visible) => {
              const next = new Set(hidden);
              if (visible) next.delete(type);
              else next.add(type);
              hidden = next;
            }}
          />{/each}
      </div>{/if}
    {#if queryOpen && onquery}<div class={styles.detail}>
        <form
          class={styles.toolbar}
          onsubmit={(event) => {
            event.preventDefault();
            void run({ kind: "query", query: draft });
          }}
        >
          <label
            >Graph query <Textarea
              aria-label="Graph query"
              bind:value={draft}
            /></label
          ><Button type="submit" disabled={busy || !draft.trim()}
            >Run query</Button
          ><Button
            disabled={busy || !node}
            onclick={() =>
              node && run({ kind: "neighborhood", node: node.label })}
            >Neighborhood</Button
          ><Button disabled={busy} onclick={() => run({ kind: "centrality" })}
            >Centrality</Button
          >
        </form>
        <form
          class={styles.toolbar}
          onsubmit={(event) => {
            event.preventDefault();
            void run({ kind: "path", from, to });
          }}
        >
          <label
            >Path from <Input aria-label="Path from" bind:value={from} /></label
          ><Button disabled={!node} onclick={() => (from = node?.label ?? "")}
            >Use selected as start</Button
          ><label>Path to <Input aria-label="Path to" bind:value={to} /></label
          ><Button disabled={!node} onclick={() => (to = node?.label ?? "")}
            >Use selected as end</Button
          ><Button type="submit" disabled={busy || !from.trim() || !to.trim()}
            >Shortest path</Button
          >
        </form>
        {#if busy}<Button
            onclick={() => {
              controller?.abort();
              busy = false;
            }}>Cancel graph query</Button
          >{/if}{#if failure}<p role="alert">{failure}</p>{/if}
      </div>{/if}
    {#if !filtered.nodes.length}<div
        data-renderer-empty="graph"
        data-empty-reason={active.nodes.length ? "filtered" : emptyReason}
        class={styles.detail}
      >
        <EmptyState
          title={active.nodes.length
            ? "No nodes match these filters"
            : emptyReason === "unsupported" ? "No graph data in this result" : "No graph data returned"}
          description={active.nodes.length
            ? "Clear graph filters to show the returned network."
            : emptyReason === "unsupported" ? "The returned records do not contain graph nodes. Inspect the source data or run a graph query." : "Run a graph query to inspect its nodes and relationships."}
          bordered={false}
          >{#snippet media()}<StateIllustration
              art={active.nodes.length ? searchEmpty : graphEmptyCompact}
              size="md"
            />{/snippet}{#snippet actions()}{#if active.nodes.length}<Button
                onclick={clear}>Clear graph filters</Button
              >{:else if recoveryHref}<Button href={recoveryHref}>{recoveryLabel}</Button>{/if}{/snippet}</EmptyState
        >
      </div>
    {:else if view === "table"}<Table
        caption={label}
        captionHidden
        rows={tableRows}
        columns={[
          { key: "id", header: "id" },
          { key: "label", header: "label" },
          { key: "type", header: "type" },
          { key: "degree", header: "degree" },
          { key: "score", header: "centrality" },
        ]}
        rowKey="id"
        pageSize={80}
        onselect={(row) =>
          select({ kind: "node", action: "click", id: String(row) })}
      /><Table
        caption={`${label} relationships`}
        rows={filtered.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label ?? "",
        }))}
        columns={[
          { key: "source", header: "source" },
          { key: "target", header: "target" },
          { key: "label", header: "relationship" },
        ]}
        rowKey="id"
        pageSize={80}
        onselect={(row) =>
          select({ kind: "edge", action: "click", id: String(row) })}
      />
    {:else}{#key view + collapsed.join(",")}<Graph
          searchable={false}
          {label}
          data={graphData}
          renderer={view === "svg" ? "svg" : "auto"}
          {grouped}
          {bundled}
          controls
          focusedNode={focus}
          onfocusednodechange={(value) => (focus = value)}
          collapsedCommunities={collapsed}
          oncollapsedcommunitieschange={(value) => (collapsed = value)}
          oninteraction={select}
        />{/key}{#if drawing.nodes.length < filtered.nodes.length}<p
          role="status"
          class={styles.detail}
        >
          Drawing {drawing.nodes.length} of {filtered.nodes.length} nodes…
        </p>{/if}{/if}
    {#if node || edge}<aside aria-label="Graph details" class={styles.detail}>
        <div class={styles.toolbar}>
          <strong>{node?.label ?? edge?.label ?? edge?.id}</strong><Button
            onclick={() => {
              selected = null;
              focus = null;
            }}>Clear selection</Button
          >
        </div>
        {#if node && detail}
        {#if canCollapse}<Button onclick={() => { collapsed = [...new Set([...collapsed, selectedCommunity!])]; selected = null; focus = null; }}>Collapse selected community</Button>{/if}<p>{detail.description ?? node.id}</p>
          <p>
            {detail.orphan ? "Orphan node" : "Connected node"} · degree {centrality.get(
              node.id,
            )?.degree ?? 0} · centrality {centrality.get(node.id)?.score ?? 0}
          </p>
          {#if href}<Link {href}>Open node resource</Link
            >{/if}{#if detail.exports.length}<p>
              Exports: {detail.exports.join(", ")}
            </p>{/if}
          <div class={styles.toolbar}>
            {#each [...detail.incoming, ...detail.outgoing] as relation (relation.id)}<Button
                onclick={() =>
                  select({
                    kind: "node",
                    action: "click",
                    id: relation.nodeId,
                  })}>{relation.direction}: {relation.nodeLabel}</Button
              >{/each}
          </div>
          <pre class={styles.value}>{JSON.stringify(node.data, null, 2)}</pre>
        {:else if edge}<p>{edge.source} → {edge.target}</p>
          <pre class={styles.value}>{JSON.stringify(
              edge.data ?? {},
              null,
              2,
            )}</pre>{/if}
      </aside>{/if}
  {/if}
</section>
