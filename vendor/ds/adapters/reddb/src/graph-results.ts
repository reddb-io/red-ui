import type { QueryResult, QueryRow } from "./client";
export interface GraphNode {
  id: string;
  label: string;
  /** Full underlying row/object — surfaced when the user clicks a node. */
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** Full underlying row/object — surfaced when the user clicks an edge. */
  data?: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary?: string;
}

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}
function pickNodeId(node: Record<string, unknown>): string | null {
  const id = node.id ?? node.rid ?? node._id ?? node.uid;
  if (id === null || id === undefined) return null;
  return String(id);
}

function pickNodeLabel(node: Record<string, unknown>, id: string): string {
  const lbl = node.label ?? node.name ?? node.title;
  if (lbl !== undefined && lbl !== null) return String(lbl);
  return id;
}

function pickEdgeEndpoints(
  edge: Record<string, unknown>,
): { source: string; target: string } | null {
  const s = edge.source ?? edge.from ?? edge.src ?? edge.start;
  const t = edge.target ?? edge.to ?? edge.dst ?? edge.end;
  if (s === null || s === undefined || t === null || t === undefined)
    return null;
  return { source: String(s), target: String(t) };
}

/**
 * Pull nodes and edges out of a graph-shaped result.
 *
 * A graph query (`MATCH (n)-[r]->(m) RETURN n, r, m`) returns rows where
 * each alias maps to a node or edge object. reddb surfaces these on the
 * QueryRow as optional `nodes` and `edges` maps (keyed by alias). We
 * dedupe nodes by id across rows and edges by (source, target, label).
 */
export function extractGraph(result: QueryResult): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  for (const rec of result.result.records as QueryRow[]) {
    // Shape A: graph-query result (`MATCH … RETURN n, r, m`).
    // reddb populates `nodes`/`edges` maps on each row keyed by alias.
    if (rec.nodes) {
      for (const value of Object.values(rec.nodes)) {
        if (!value || typeof value !== "object") continue;
        const node = value as Record<string, unknown>;
        const id = pickNodeId(node);
        if (!id) continue;
        if (!nodes.has(id)) {
          nodes.set(id, { id, label: pickNodeLabel(node, id), data: node });
        }
      }
    }
    if (rec.edges) {
      for (const value of Object.values(rec.edges)) {
        if (!value || typeof value !== "object") continue;
        const edge = value as Record<string, unknown>;
        const ends = pickEdgeEndpoints(edge);
        if (!ends) continue;
        const label = edge.label ?? edge.edge_type ?? edge.type ?? edge.rel;
        const key = `${ends.source}->${ends.target}:${asString(label)}`;
        if (!edges.has(key)) {
          edges.set(key, {
            id: key,
            source: ends.source,
            target: ends.target,
            label: label !== undefined ? String(label) : undefined,
            data: edge,
          });
        }
      }
    }

    // Shape B: row-shape from `SELECT * FROM <graph>` where each row IS a
    // node OR an edge, discriminated by reddb's `kind` system column.
    const row = (rec as QueryRow & { values?: Record<string, unknown> }).values;
    if (row && typeof row === "object") {
      const kind = row.kind;
      if (kind === "node") {
        const id = pickNodeId(row);
        if (id && !nodes.has(id)) {
          nodes.set(id, { id, label: pickNodeLabel(row, id), data: row });
        }
      } else if (kind === "edge") {
        const s = row.from_rid ?? row.from;
        const t = row.to_rid ?? row.to;
        if (s !== undefined && s !== null && t !== undefined && t !== null) {
          const source = String(s);
          const target = String(t);
          const label = row.label ?? row.type ?? row.rel;
          const rid = row.rid ?? row.id ?? `${source}->${target}`;
          const key = `e:${rid}`;
          if (!edges.has(key)) {
            edges.set(key, {
              id: key,
              source,
              target,
              label: label !== undefined ? String(label) : undefined,
              data: row,
            });
          }
        }
      }
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

export function hasGraphShape(result: QueryResult): boolean {
  const records = result.result?.records as QueryRow[] | undefined;
  if (!records || records.length === 0) return false;
  return records.some((r) => {
    if (r.nodes && Object.keys(r.nodes).length > 0) return true;
    if (r.edges && Object.keys(r.edges).length > 0) return true;
    const row = (r as QueryRow & { values?: Record<string, unknown> }).values;
    if (row && (row.kind === "node" || row.kind === "edge")) return true;
    return false;
  });
}

/** Quote graph operands as SQL strings rather than concatenating user-controlled labels. */
export function graphQuery(
  request:
    | { kind: "query"; query: string }
    | { kind: "neighborhood"; node: string }
    | { kind: "centrality" }
    | { kind: "path"; from: string; to: string },
): string {
  const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
  switch (request.kind) {
    case "query":
      return request.query;
    case "centrality":
      return "GRAPH CENTRALITY LIMIT 50";
    case "neighborhood":
      return `GRAPH NEIGHBORHOOD ${quote(request.node)} DEPTH 1`;
    case "path":
      return `GRAPH SHORTEST_PATH ${quote(request.from.trim())} TO ${quote(request.to.trim())}`;
  }
}

/** Materialized graph algorithms return scalar rows, not MATCH envelopes. */
export function graphQueryResult(result: QueryResult, previous: GraphData): GraphData {
  if (!result.ok) throw new Error(result.error ?? 'Graph query failed.');
  const graph = extractGraph(result);
  if (graph.nodes.length) return graph;
  const rows = result.result.records.map(record => record.values ?? {});
  if (rows.length && rows.every(row => row.node_id != null)) {
    const byId = new Map(previous.nodes.map(node => [node.id, node]));
    const nodes = rows.map(row => {
      const id = String(row.node_id), old = byId.get(id);
      return { id, label: String(row.label ?? old?.label ?? id), data: {...old?.data, ...row} };
    });
    const ids = new Set(nodes.map(node => node.id));
    return {nodes, edges: previous.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)),
      summary: 'Algorithm results with relationships from the loaded graph.'};
  }
  const path = rows.find(row => typeof row.path_found === 'boolean');
  if (path) return {...previous, summary: path.path_found
    ? `Path found: ${path.hop_count ?? '?'} hops, total weight ${path.total_weight ?? '?'}. The server returned path metrics only; showing the loaded graph.`
    : 'No path found. Showing the loaded graph.'};
  if (rows.length) throw new Error('This query returned no graph nodes. Use the table renderer to inspect its result.');
  return graph;
}
