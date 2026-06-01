// Universal graph.json loader.
//
// Parses an arbitrary `graph.json` that conforms to the cross-repo export
// contract (reddb-io/red-skills#234 — the shape emitted by the memory
// `export` skill, graphify, and codebase-graph tooling) and adapts it into
// the *same* `QueryResult` shape the existing `GraphRenderer` already
// consumes. We deliberately reuse `extractGraph`/`GraphRenderer` rather than
// building a parallel renderer: the loader is purely a data path that hands
// the canvas a graph-shaped result, so community coloring, force layout,
// search, and centrality all keep working unchanged and offline.
//
// Server-backed affordances inside the renderer (GRAPH NEIGHBORHOOD /
// SHORTEST_PATH / CENTRALITY) issue live queries and are inert without a
// connection — expected for a static file.

import type { QueryResult } from "#reddb";
import { colorForCommunity } from "$lib/renderers/graph-render";

/** Major version of the graph.json contract this loader understands. */
export const SUPPORTED_GRAPH_VERSION_MAJOR = 1;

/** A normalized node in the loaded model. */
export interface LoadedGraphNode {
  id: string;
  label: string;
  type?: string;
  community?: number;
  /** Full original node object, preserved for the renderer's detail panel. */
  data: Record<string, unknown>;
}

/** A normalized edge in the loaded model. */
export interface LoadedGraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  /** Full original edge object. */
  data: Record<string, unknown>;
}

/** A normalized community descriptor. */
export interface LoadedGraphCommunity {
  id: number;
  label: string;
  color: string;
  size: number;
}

/** The result of loading a contract-conformant graph.json. */
export interface LoadedGraph {
  /** Declared contract version string. */
  version: string;
  /** Normalized node/edge/community model (what the unit tests assert on). */
  model: {
    nodes: LoadedGraphNode[];
    edges: LoadedGraphEdge[];
    communities: LoadedGraphCommunity[];
  };
  /** A graph-shaped QueryResult ready to hand straight to `GraphRenderer`. */
  result: QueryResult;
  /** Free-form metadata block carried by the export, if any. */
  meta: Record<string, unknown>;
}

/** Raised when an export is structurally malformed or the wrong version. */
export class GraphContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphContractError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstDefined(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function parseVersion(raw: Record<string, unknown>): string {
  const v = firstDefined(raw, ["version", "schema_version", "schemaVersion"]);
  if (typeof v !== "string" || v.trim() === "") {
    throw new GraphContractError(
      'Graph export is missing a "version" string. ' +
        `This viewer supports the version ${SUPPORTED_GRAPH_VERSION_MAJOR}.x contract.`
    );
  }
  const major = Number.parseInt(v.split(".")[0] ?? "", 10);
  if (!Number.isFinite(major)) {
    throw new GraphContractError(
      `Graph export declares an unparseable version "${v}". ` +
        `This viewer supports version ${SUPPORTED_GRAPH_VERSION_MAJOR}.x.`
    );
  }
  if (major !== SUPPORTED_GRAPH_VERSION_MAJOR) {
    throw new GraphContractError(
      `Unsupported graph export version "${v}". ` +
        `This viewer supports version ${SUPPORTED_GRAPH_VERSION_MAJOR}.x.`
    );
  }
  return v;
}

function normalizeNode(raw: unknown, index: number): LoadedGraphNode {
  if (!isObject(raw)) {
    throw new GraphContractError(
      `Graph node at index ${index} is not an object.`
    );
  }
  const rawId = firstDefined(raw, ["id", "rid", "_id", "uid"]);
  if (rawId === undefined) {
    throw new GraphContractError(
      `Graph node at index ${index} is missing the required "id" field.`
    );
  }
  const id = String(rawId);
  const label = firstDefined(raw, ["label", "name", "title"]);
  const type = firstDefined(raw, ["type", "node_type", "kind"]);
  const community = raw.community;
  return {
    id,
    label: label !== undefined ? String(label) : id,
    type: type !== undefined ? String(type) : undefined,
    community: typeof community === "number" ? community : undefined,
    data: raw,
  };
}

function normalizeEdge(raw: unknown, index: number): LoadedGraphEdge {
  if (!isObject(raw)) {
    throw new GraphContractError(
      `Graph edge at index ${index} is not an object.`
    );
  }
  const source = firstDefined(raw, [
    "source",
    "from",
    "src",
    "start",
    "from_rid",
  ]);
  if (source === undefined) {
    throw new GraphContractError(
      `Graph edge at index ${index} is missing the required "source" field.`
    );
  }
  const target = firstDefined(raw, ["target", "to", "dst", "end", "to_rid"]);
  if (target === undefined) {
    throw new GraphContractError(
      `Graph edge at index ${index} is missing the required "target" field.`
    );
  }
  const type = firstDefined(raw, ["kind", "type", "label", "rel"]);
  const s = String(source);
  const t = String(target);
  const rawId = firstDefined(raw, ["id", "rid"]);
  const id =
    rawId !== undefined ? String(rawId) : `${s}->${t}:${type ?? ""}#${index}`;
  return {
    id,
    source: s,
    target: t,
    type: type !== undefined ? String(type) : undefined,
    data: raw,
  };
}

function normalizeCommunities(raw: unknown): LoadedGraphCommunity[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new GraphContractError(
      'Graph export "communities" must be an array when present.'
    );
  }
  return raw.map((entry, index) => {
    if (!isObject(entry)) {
      throw new GraphContractError(
        `Community at index ${index} is not an object.`
      );
    }
    if (typeof entry.id !== "number") {
      throw new GraphContractError(
        `Community at index ${index} is missing a numeric "id".`
      );
    }
    const id = entry.id;
    return {
      id,
      label: typeof entry.label === "string" ? entry.label : `Community ${id}`,
      color:
        typeof entry.color === "string" ? entry.color : colorForCommunity(id),
      size: typeof entry.size === "number" ? entry.size : 0,
    };
  });
}

/**
 * Build a graph-shaped `QueryResult` from the normalized model. All nodes and
 * edges go into a single record's `nodes`/`edges` maps (keyed by id) — exactly
 * the "Shape A" that `extractGraph`/`hasGraphShape` recognize, so the existing
 * `GraphRenderer` paints it without modification.
 */
function toQueryResult(
  nodes: LoadedGraphNode[],
  edges: LoadedGraphEdge[]
): QueryResult {
  const nodeMap: Record<string, Record<string, unknown>> = {};
  for (const n of nodes) {
    nodeMap[n.id] = {
      ...n.data,
      id: n.id,
      label: n.label,
      ...(n.type !== undefined ? { node_type: n.type } : {}),
    };
  }
  const edgeMap: Record<string, Record<string, unknown>> = {};
  for (const e of edges) {
    edgeMap[e.id] = {
      ...e.data,
      source: e.source,
      target: e.target,
      ...(e.type !== undefined ? { type: e.type } : {}),
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

/**
 * Validate and normalize a parsed graph.json value.
 *
 * Accepts both the nested envelope (`{ version, graph: { nodes, edges } }`) and
 * the flat one (`{ version, nodes, edges }`), since "universal" means liberal
 * in what we accept. Throws a {@link GraphContractError} with an actionable
 * message when the value is not an object, declares an unsupported version, or
 * is missing required node/edge fields.
 */
export function parseGraphExport(raw: unknown): LoadedGraph {
  if (!isObject(raw)) {
    throw new GraphContractError(
      'Graph export must be a JSON object with "version" and graph data.'
    );
  }

  const contract = isObject(raw.contract) ? raw.contract : null;
  const version = parseVersion(contract ?? raw);

  const container = contract ?? (isObject(raw.graph) ? raw.graph : raw);
  const nodesRaw = container.nodes;
  const edgesRaw = container.edges;
  if (!Array.isArray(nodesRaw)) {
    throw new GraphContractError('Graph export "nodes" must be an array.');
  }
  if (!Array.isArray(edgesRaw)) {
    throw new GraphContractError('Graph export "edges" must be an array.');
  }

  const nodes = nodesRaw.map(normalizeNode);
  const edges = edgesRaw.map(normalizeEdge);
  const communities = normalizeCommunities(
    raw.communities ?? container.communities
  );

  return {
    version,
    model: { nodes, edges, communities },
    result: toQueryResult(nodes, edges),
    meta: isObject(raw.meta) ? raw.meta : {},
  };
}

/**
 * Parse a raw JSON string into a {@link LoadedGraph}. Wraps
 * {@link parseGraphExport}, converting JSON syntax errors into a
 * {@link GraphContractError} so callers handle a single error type.
 */
export function parseGraphExportJson(text: string): LoadedGraph {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new GraphContractError(`Graph export is not valid JSON: ${detail}`);
  }
  return parseGraphExport(value);
}

/**
 * Fetch a graph.json from a path or URL and normalize it. `src` may be an
 * absolute URL (`https://…/graph.json`) or a same-origin path
 * (`/exports/memory.json`). Inject `opts.fetch` for tests.
 */
export async function loadGraphExport(
  src: string,
  opts: { fetch?: typeof fetch } = {}
): Promise<LoadedGraph> {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new GraphContractError(
      "No fetch implementation available to load the graph."
    );
  }

  let res: Response;
  try {
    res = await fetchFn(src);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new GraphContractError(
      `Failed to fetch graph from "${src}": ${detail}`
    );
  }

  if (!res.ok) {
    throw new GraphContractError(
      `Failed to load graph from "${src}": HTTP ${res.status} ${res.statusText}`.trim()
    );
  }

  const text = await res.text();
  return parseGraphExportJson(text);
}
