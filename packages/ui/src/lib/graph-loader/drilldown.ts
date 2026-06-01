import type { QueryResult } from "#reddb";
import type { LoadedGraph, LoadedGraphEdge, LoadedGraphNode } from "./contract";

type GraphModel = LoadedGraph["model"];

export interface DrilldownNodeSummary {
  id: string;
  label: string;
  type: string;
  degree: number;
  incoming: number;
  outgoing: number;
}

export interface DrilldownComponent {
  id: string;
  label: string;
  nodeCount: number;
  connectionCount: number;
  internalConnectionCount: number;
  externalConnectionCount: number;
  nodeIds: string[];
  nodes: DrilldownNodeSummary[];
}

export interface DrilldownLayer {
  id: string;
  label: string;
  color: string;
  nodeCount: number;
  componentCount: number;
  connectionCount: number;
  internalConnectionCount: number;
  externalConnectionCount: number;
  nodeIds: string[];
  components: DrilldownComponent[];
}

export interface GraphDrilldown {
  layers: DrilldownLayer[];
}

const LAYER_FIELDS = [
  "layer",
  "layer_name",
  "layerName",
  "layer_id",
  "layerId",
  "domain",
  "namespace",
];

const COMMUNITY_FIELDS = [
  "community",
  "community_name",
  "communityName",
  "community_id",
  "communityId",
];

const COMPONENT_FIELDS = [
  "component",
  "component_name",
  "componentName",
  "component_id",
  "componentId",
  "package",
  "module",
  "service",
  "collection",
  "file",
  "path",
];

const FALLBACK_LAYER = {
  id: "unassigned",
  label: "Unassigned",
  color: "#94a3b8",
};

const SAFE_COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%+-]+\)|hsla?\([\d\s.,%+-]+\)|oklch\([\d\s.%+-]+(?:\/\s*[\d.]+%?)?\))$/i;

function safeColor(value: string): string {
  const trimmed = value.trim();
  return SAFE_COLOR_PATTERN.test(trimmed) ? trimmed : FALLBACK_LAYER.color;
}

function firstPresentString(
  data: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    const value = data[field];
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "string" || typeof value === "number")
      return String(value);
  }
  return null;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}:${value.toLowerCase().replace(/[^a-z0-9._:/-]+/g, "-")}`;
}

function communityMap(
  model: GraphModel
): Map<number, { label: string; color: string }> {
  return new Map(
    model.communities.map((community) => [
      community.id,
      { label: community.label, color: safeColor(community.color) },
    ])
  );
}

function layerIdentity(
  node: LoadedGraphNode,
  communities: Map<number, { label: string; color: string }>
): { id: string; label: string; color: string } {
  const explicitLayer = firstPresentString(node.data, LAYER_FIELDS);
  if (explicitLayer) {
    return {
      id: stableId("layer", explicitLayer),
      label: explicitLayer,
      color: "#94a3b8",
    };
  }

  if (typeof node.community === "number") {
    const community = communities.get(node.community);
    return {
      id: `community:${node.community}`,
      label: community?.label ?? `Community ${node.community}`,
      color: community?.color ?? "#94a3b8",
    };
  }

  const explicitCommunity = firstPresentString(node.data, COMMUNITY_FIELDS);
  if (explicitCommunity) {
    return {
      id: stableId("community", explicitCommunity),
      label: explicitCommunity,
      color: "#94a3b8",
    };
  }

  return FALLBACK_LAYER;
}

function componentIdentity(node: LoadedGraphNode): {
  id: string;
  label: string;
} {
  const explicit = firstPresentString(node.data, COMPONENT_FIELDS);
  if (explicit) return { id: stableId("component", explicit), label: explicit };

  const type =
    node.type ?? firstPresentString(node.data, ["node_type", "kind"]);
  if (type) return { id: stableId("type", type), label: `${type} nodes` };

  return { id: "component:unassigned", label: "Unassigned" };
}

function connectionStats(ids: Set<string>, edges: LoadedGraphEdge[]) {
  let connectionCount = 0;
  let internalConnectionCount = 0;
  let externalConnectionCount = 0;

  for (const edge of edges) {
    const hasSource = ids.has(edge.source);
    const hasTarget = ids.has(edge.target);
    if (!hasSource && !hasTarget) continue;

    connectionCount += 1;
    if (hasSource && hasTarget) internalConnectionCount += 1;
    else externalConnectionCount += 1;
  }

  return { connectionCount, internalConnectionCount, externalConnectionCount };
}

function nodeSummary(
  node: LoadedGraphNode,
  edges: LoadedGraphEdge[]
): DrilldownNodeSummary {
  let incoming = 0;
  let outgoing = 0;
  for (const edge of edges) {
    if (edge.source === node.id) outgoing += 1;
    if (edge.target === node.id) incoming += 1;
  }

  return {
    id: node.id,
    label: node.label,
    type:
      node.type ??
      firstPresentString(node.data, ["node_type", "kind"]) ??
      "node",
    degree: incoming + outgoing,
    incoming,
    outgoing,
  };
}

function byLargestThenLabel<
  T extends {
    nodeCount: number;
    connectionCount: number;
    label: string;
    id: string;
  },
>(a: T, b: T): number {
  const nodes = b.nodeCount - a.nodeCount;
  if (nodes !== 0) return nodes;
  const connections = b.connectionCount - a.connectionCount;
  if (connections !== 0) return connections;
  const label = a.label.localeCompare(b.label);
  if (label !== 0) return label;
  return a.id.localeCompare(b.id);
}

export function buildGraphDrilldown(model: GraphModel): GraphDrilldown {
  const communities = communityMap(model);
  const layerBuckets = new Map<
    string,
    { id: string; label: string; color: string; nodes: LoadedGraphNode[] }
  >();

  for (const node of model.nodes) {
    const layer = layerIdentity(node, communities);
    const bucket = layerBuckets.get(layer.id);
    if (bucket) bucket.nodes.push(node);
    else layerBuckets.set(layer.id, { ...layer, nodes: [node] });
  }

  const layers = [...layerBuckets.values()].map((layer): DrilldownLayer => {
    const nodeIds = layer.nodes.map((node) => node.id);
    const idSet = new Set(nodeIds);
    const stats = connectionStats(idSet, model.edges);
    const componentBuckets = new Map<
      string,
      { id: string; label: string; nodes: LoadedGraphNode[] }
    >();

    for (const node of layer.nodes) {
      const component = componentIdentity(node);
      const bucket = componentBuckets.get(component.id);
      if (bucket) bucket.nodes.push(node);
      else componentBuckets.set(component.id, { ...component, nodes: [node] });
    }

    const components = [...componentBuckets.values()]
      .map((component): DrilldownComponent => {
        const componentNodeIds = component.nodes.map((node) => node.id);
        const componentStats = connectionStats(
          new Set(componentNodeIds),
          model.edges
        );
        return {
          id: component.id,
          label: component.label,
          nodeCount: component.nodes.length,
          nodeIds: componentNodeIds,
          nodes: component.nodes
            .map((node) => nodeSummary(node, model.edges))
            .sort(
              (a, b) => b.degree - a.degree || a.label.localeCompare(b.label)
            ),
          ...componentStats,
        };
      })
      .sort(byLargestThenLabel);

    return {
      id: layer.id,
      label: layer.label,
      color: layer.color,
      nodeCount: layer.nodes.length,
      componentCount: components.length,
      nodeIds,
      components,
      ...stats,
    };
  });

  return { layers: layers.sort(byLargestThenLabel) };
}

export function graphResultForNodeIds(
  model: GraphModel,
  nodeIds: Iterable<string> | null
): QueryResult {
  const selectedIds = nodeIds === null ? null : new Set(nodeIds);
  const nodes = selectedIds
    ? model.nodes.filter((node) => selectedIds.has(node.id))
    : model.nodes;
  const visibleIds = new Set(nodes.map((node) => node.id));
  const edges = model.edges.filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
  );

  const nodeMap: Record<string, Record<string, unknown>> = {};
  for (const node of nodes) {
    nodeMap[node.id] = {
      ...node.data,
      id: node.id,
      label: node.label,
      ...(node.type !== undefined ? { node_type: node.type } : {}),
    };
  }

  const edgeMap: Record<string, Record<string, unknown>> = {};
  for (const edge of edges) {
    edgeMap[edge.id] = {
      ...edge.data,
      source: edge.source,
      target: edge.target,
      ...(edge.type !== undefined ? { type: edge.type } : {}),
    };
  }

  return {
    ok: true,
    query: "",
    capability: "graph",
    record_count: nodes.length + edges.length,
    result: {
      columns: ["nodes", "edges"],
      records: [{ values: {}, nodes: nodeMap, edges: edgeMap }],
    },
  } as QueryResult;
}
