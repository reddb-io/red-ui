// Pure rendering helpers for the graph capability. Shared between the
// Svelte GraphRenderer (xyflow canvas) and the golden-snapshot test
// (which checks the adjacency-list / DOM-free shape).

import type { QueryResult, QueryRow } from "#reddb";
import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import forceAtlas2 from "graphology-layout-forceatlas2";

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
}

export interface GraphNodeCentrality {
  degree: number;
  inDegree: number;
  outDegree: number;
  score: number;
}

export type GraphEdgeKind = "imports" | "defines" | "references";

export interface GraphNodeRelation {
  id: string;
  kind: GraphEdgeKind;
  direction: "incoming" | "outgoing";
  label: string;
  edgeLabel?: string;
  nodeId: string;
  nodeLabel: string;
}

export interface GraphNodeDetail {
  description: string | null;
  exports: string[];
  orphan: boolean;
  incoming: GraphNodeRelation[];
  outgoing: GraphNodeRelation[];
  whereUsed: GraphNodeRelation[];
}

const CENTRALITY_FIELDS = [
  "centrality_score",
  "centrality",
  "pagerank",
  "page_rank",
  "betweenness",
  "closeness",
  "eigenvector",
  "degree",
  "score",
];

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asFiniteNumber(v: unknown): number | null {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim()
        ? Number(v)
        : NaN;
  return Number.isFinite(n) ? n : null;
}

function explicitCentralityScore(node: GraphNode): number | null {
  for (const field of CENTRALITY_FIELDS) {
    const n = asFiniteNumber(node.data[field]);
    if (n !== null) return n;
  }
  return null;
}

function firstString(
  data: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    const value = data[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function nestedObject(
  data: Record<string, unknown>,
  field: string
): Record<string, unknown> | null {
  const value = data[field];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is string | number =>
        typeof item === "string" || typeof item === "number"
    )
    .map((item) => String(item).trim())
    .filter(Boolean);
}

export function graphNodeDescription(node: GraphNode): string | null {
  const metadata = nestedObject(node.data, "metadata");
  return (
    firstString(node.data, ["description", "summary", "content"]) ??
    (metadata
      ? firstString(metadata, ["description", "summary", "content"])
      : null)
  );
}

export function graphNodeExports(node: GraphNode): string[] {
  const direct = stringList(node.data.exports);
  if (direct.length > 0) return direct;
  const metadata = nestedObject(node.data, "metadata");
  return metadata ? stringList(metadata.exports) : [];
}

function flagValue(
  data: Record<string, unknown>,
  fields: string[]
): boolean | null {
  for (const field of fields) {
    const value = data[field];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lowered = value.trim().toLowerCase();
      if (["true", "yes", "1"].includes(lowered)) return true;
      if (["false", "no", "0"].includes(lowered)) return false;
    }
  }
  return null;
}

export function graphNodeIsOrphan(
  node: GraphNode,
  centrality?: Map<string, GraphNodeCentrality>
): boolean {
  const metadata = nestedObject(node.data, "metadata");
  const explicit =
    flagValue(node.data, [
      "orphan",
      "is_orphan",
      "isOrphan",
      "dead_code",
      "deadCode",
    ]) ??
    (metadata
      ? flagValue(metadata, [
          "orphan",
          "is_orphan",
          "isOrphan",
          "dead_code",
          "deadCode",
        ])
      : null);
  if (explicit !== null) return explicit;
  return (centrality?.get(node.id)?.inDegree ?? 1) === 0;
}

function normalizeEdgeKind(edge: GraphEdge): GraphEdgeKind {
  const raw = edge.data?.kind ?? edge.data?.type ?? edge.label;
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "imports" || value === "import" || value === "imports_from")
    return "imports";
  if (value === "defines" || value === "defined_in" || value === "contains")
    return "defines";
  return "references";
}

function relationLabel(
  kind: GraphEdgeKind,
  direction: "incoming" | "outgoing"
): string {
  if (kind === "imports")
    return direction === "incoming" ? "imported by" : "imports";
  if (kind === "defines")
    return direction === "incoming" ? "defined by" : "defines";
  return direction === "incoming" ? "referenced by" : "references";
}

export function graphNodeDetail(
  node: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
  centrality?: Map<string, GraphNodeCentrality>
): GraphNodeDetail {
  const nodesById = new Map(nodes.map((entry) => [entry.id, entry]));
  const relations: GraphNodeRelation[] = [];

  for (const edge of edges) {
    const direction =
      edge.source === node.id
        ? "outgoing"
        : edge.target === node.id
          ? "incoming"
          : null;
    if (!direction) continue;
    const otherId = direction === "outgoing" ? edge.target : edge.source;
    const other = nodesById.get(otherId);
    const kind = normalizeEdgeKind(edge);
    relations.push({
      id: edge.id,
      kind,
      direction,
      label: relationLabel(kind, direction),
      edgeLabel: edge.label,
      nodeId: otherId,
      nodeLabel: other?.label ?? otherId,
    });
  }

  const byKindThenLabel = (a: GraphNodeRelation, b: GraphNodeRelation) =>
    a.kind.localeCompare(b.kind) ||
    a.nodeLabel.localeCompare(b.nodeLabel) ||
    a.nodeId.localeCompare(b.nodeId);
  const incoming = relations
    .filter((relation) => relation.direction === "incoming")
    .sort(byKindThenLabel);
  const outgoing = relations
    .filter((relation) => relation.direction === "outgoing")
    .sort(byKindThenLabel);

  return {
    description: graphNodeDescription(node),
    exports: graphNodeExports(node),
    orphan: graphNodeIsOrphan(node, centrality),
    incoming,
    outgoing,
    whereUsed: incoming,
  };
}

export function graphNodeCentrality(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, GraphNodeCentrality> {
  const stats = new Map<string, GraphNodeCentrality>();
  for (const node of nodes) {
    stats.set(node.id, {
      degree: 0,
      inDegree: 0,
      outDegree: 0,
      score: explicitCentralityScore(node) ?? 0,
    });
  }

  for (const edge of edges) {
    const source = stats.get(edge.source);
    const target = stats.get(edge.target);
    if (source) {
      source.outDegree += 1;
      source.degree += 1;
    }
    if (target) {
      target.inDegree += 1;
      target.degree += 1;
    }
  }

  for (const node of nodes) {
    const stat = stats.get(node.id);
    if (!stat) continue;
    stat.score = explicitCentralityScore(node) ?? stat.degree;
  }
  return stats;
}

export function compareGraphNodesByCentrality(
  a: GraphNode,
  b: GraphNode,
  centrality: Map<string, GraphNodeCentrality>
): number {
  const ca = centrality.get(a.id);
  const cb = centrality.get(b.id);
  const scoreDelta = (cb?.score ?? 0) - (ca?.score ?? 0);
  if (scoreDelta !== 0) return scoreDelta;
  const degreeDelta = (cb?.degree ?? 0) - (ca?.degree ?? 0);
  if (degreeDelta !== 0) return degreeDelta;
  const labelDelta = a.label.localeCompare(b.label);
  if (labelDelta !== 0) return labelDelta;
  return a.id.localeCompare(b.id);
}

export function graphNodeIncomingSizeScales(
  nodes: GraphNode[],
  centrality: Map<string, GraphNodeCentrality>
): Map<string, number> {
  const values = nodes.map((node) => centrality.get(node.id)?.inDegree ?? 0);
  const max = Math.max(0, ...values);
  if (max <= 0) return new Map(nodes.map((node) => [node.id, 1]));

  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length === 1) return new Map(nodes.map((node) => [node.id, 1]));

  return new Map(
    nodes.map((node) => {
      const incoming = centrality.get(node.id)?.inDegree ?? 0;
      if (incoming <= 0) return [node.id, 1] as const;
      const percentile =
        values.filter((v) => v <= incoming).length / values.length;
      if (percentile > 0.95) return [node.id, 2] as const;
      if (percentile > 0.8) return [node.id, 1.5] as const;
      if (percentile > 0.5) return [node.id, 1.25] as const;
      return [node.id, 1] as const;
    })
  );
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
  edge: Record<string, unknown>
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
        const label = edge.label ?? edge.type ?? edge.rel;
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

/**
 * DOM-free adjacency-list HTML for snapshot tests and for the "view as
 * adjacency list to export" affordance.
 */
export function renderGraphHtml(result: QueryResult): string {
  const { nodes, edges } = extractGraph(result);
  const lines: string[] = [];
  lines.push('<section class="graph">');
  lines.push(
    `<header class="summary">${nodes.length} nodes · ${edges.length} edges</header>`
  );
  lines.push('<ul class="nodes">');
  for (const n of nodes) {
    lines.push(
      `<li class="node" data-id="${escapeHtml(n.id)}">${escapeHtml(n.label)}</li>`
    );
  }
  lines.push("</ul>");
  lines.push('<ul class="edges">');
  for (const e of edges) {
    const lbl = e.label ? ` [${escapeHtml(e.label)}]` : "";
    lines.push(
      `<li class="edge">${escapeHtml(e.source)} →${lbl} ${escapeHtml(e.target)}</li>`
    );
  }
  lines.push("</ul>");
  lines.push("</section>");
  return lines.join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface GraphLayoutNode {
  x: number;
  y: number;
  community: number;
}

export type GraphLayout = Map<string, GraphLayoutNode>;

// Deterministic seed so consecutive renders of the same query don't jitter.
// Mulberry32 — small, fast, good enough for FA2 initialisation.
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute a community-aware layout for the graph.
 *
 * Pipeline: Louvain detects communities, ForceAtlas2 positions nodes so
 * communities cluster spatially. Output is normalised to a [0, 100] box
 * matching the existing renderer's coordinate space, with a 5% padding so
 * nodes don't touch the viewport edge.
 *
 * Disconnected / trivial graphs (0–1 nodes, or no edges) bypass FA2 and
 * fall back to a simple grid so the renderer still has positions.
 */
export function runGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphLayout {
  const out: GraphLayout = new Map();
  if (nodes.length === 0) return out;
  if (nodes.length === 1) {
    out.set(nodes[0].id, { x: 50, y: 50, community: 0 });
    return out;
  }

  const g = new Graph({
    type: "undirected",
    multi: false,
    allowSelfLoops: true,
  });
  const rng = seededRng(nodes.length * 131 + edges.length);

  // Initial positions on a unit circle — FA2 can't start from all-zero
  // (force vectors collapse). Random-ish placement breaks symmetry.
  const tau = Math.PI * 2;
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * tau + rng() * 0.1;
    g.addNode(n.id, { x: Math.cos(angle), y: Math.sin(angle) });
  });

  for (const e of edges) {
    if (!g.hasNode(e.source) || !g.hasNode(e.target)) continue;
    if (e.source === e.target) continue;
    // Collapse parallel edges so the simple undirected graph stays valid;
    // FA2 doesn't gain anything from multiplicity here.
    if (g.hasEdge(e.source, e.target)) continue;
    g.addEdge(e.source, e.target);
  }

  // Louvain needs at least one edge; degenerate graphs get every node in
  // its own community and a grid fallback below.
  if (g.size === 0) {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    nodes.forEach((n, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      out.set(n.id, {
        x: 10 + (col / Math.max(1, cols - 1)) * 80,
        y: 10 + (row / Math.max(1, cols - 1)) * 80,
        community: i,
      });
    });
    return out;
  }

  louvain.assign(g, { nodeCommunityAttribute: "community", rng });

  const settings = forceAtlas2.inferSettings(g);
  forceAtlas2.assign(g, {
    iterations: nodes.length > 200 ? 120 : 200,
    settings: {
      ...settings,
      strongGravityMode: true,
      gravity: 1.2,
      scalingRatio: 10,
      barnesHutOptimize: nodes.length > 500,
    },
  });

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  g.forEachNode((_, attrs) => {
    if (attrs.x < minX) minX = attrs.x;
    if (attrs.x > maxX) maxX = attrs.x;
    if (attrs.y < minY) minY = attrs.y;
    if (attrs.y > maxY) maxY = attrs.y;
  });
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const PAD = 5;
  const RANGE = 100 - PAD * 2;

  g.forEachNode((id, attrs) => {
    out.set(id, {
      x: PAD + ((attrs.x - minX) / spanX) * RANGE,
      y: PAD + ((attrs.y - minY) / spanY) * RANGE,
      community: (attrs.community as number) ?? 0,
    });
  });

  return out;
}

/**
 * Stable, distinguishable hue per community. The first ~12 communities
 * pick from a hand-tuned palette; beyond that, golden-angle on the hue
 * wheel keeps neighbours distinct without coordination.
 *
 * Saturation/lightness are theme-aware so the palette reads well on the
 * dark canvas without going neon.
 */
export function colorForCommunity(
  community: number,
  dark: boolean = true
): string {
  const PALETTE = [200, 25, 145, 290, 50, 175, 320, 95, 0, 260, 220, 130];
  const hue =
    community < PALETTE.length
      ? PALETTE[community]
      : (PALETTE[0] + community * 137.508) % 360;
  const sat = dark ? 62 : 58;
  const light = dark ? 60 : 48;
  return `hsl(${hue.toFixed(0)} ${sat}% ${light}%)`;
}
