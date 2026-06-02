// Graph → sigma.js adapter. Pure, DOM-free, and — critically — free of any
// `sigma` import: sigma touches WebGL globals at module load, which throws in
// the node test environment. The Svelte component dynamically imports sigma in
// the browser and wires these helpers to its reducers/events. Everything here
// is unit-testable against a plain `graphology.Graph`.

import Graph from "graphology";
import {
  colorForCommunity,
  type GraphEdge,
  type GraphLayout,
  type GraphNode,
} from "./graph-render";

// ─── type → colour / size contract (moved out of the component so the sigma
//     adapter and the SVG fallback share one source of truth) ───────────────

/** Literal type colours so the renderer never depends on resolving CSS vars. */
export function colorForType(type: string): string {
  switch (type) {
    case "tale":
      return "#ff2056"; // accent
    case "character":
      return "#7dd3fc"; // sky-300
    case "location":
      return "#a3e635"; // lime-400
    case "object":
      return "#fbbf24"; // amber-400
    case "archetype":
      return "#a78bfa"; // violet-400
    default:
      return "#94a3b8"; // slate-400
  }
}

export function sizeForType(type: string): number {
  if (type === "tale") return 8;
  if (type === "character") return 5;
  if (type === "location" || type === "object") return 4;
  return 3;
}

export function nodeVisualRadius(type: string, incomingScale: number): number {
  const base = Math.max(0.35, Math.min(1.25, sizeForType(type) * 0.14));
  return Math.max(0.35, Math.min(2.5, base * incomingScale));
}

// Map the unit-ish visual radius onto a sigma pixel size. Sigma sizes are in
// screen pixels at camera ratio 1; the factor keeps hubs prominent without the
// graph turning into a field of touching discs.
const SIGMA_SIZE_FACTOR = 3.4;

export function sigmaNodeSize(type: string, incomingScale: number): number {
  return nodeVisualRadius(type, incomingScale) * SIGMA_SIZE_FACTOR;
}

// ─── colour utilities (sigma's WebGL colour parser handles hex/rgb(a) but not
//     hsl(), so community tints are converted up front) ─────────────────────

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = light - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function parseHsl(value: string): Rgb | null {
  // Matches `hsl(200 62% 60%)` and the legacy comma form.
  const m = value.match(
    /hsl\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/i
  );
  if (!m) return null;
  return hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
}

function rgbString({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Community tint as an rgb() string sigma can parse (input may be hsl()). */
export function sigmaColorForCommunity(
  community: number,
  dark: boolean = true
): string {
  const hsl = colorForCommunity(community, dark);
  const rgb = parseHsl(hsl);
  return rgb ? rgbString(rgb) : hsl;
}

/** Wrap a known rgb()/hsl()/hex colour with an alpha for dimming. */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const hsl = color.startsWith("hsl") ? parseHsl(color) : null;
  if (hsl) return `rgba(${hsl.r}, ${hsl.g}, ${hsl.b}, ${a})`;
  const rgb = color.match(/rgb\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${a})`;
  const hex = color.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
}

// ─── theme palette consumed by the reducers ────────────────────────────────

export interface SigmaThemeColors {
  background: string;
  edge: string;
  focusEdge: string;
  focusNodeStroke: string;
  selectedNodeStroke: string;
  nodeStroke: string;
  warn: string;
}

export const FOCUS_EDGE_COLOR = "#d6a72c";
export const FOCUS_NODE_STROKE_COLOR = "#f4c84a";

// ─── graphology graph attributes ────────────────────────────────────────────

export interface SigmaNodeAttributes {
  x: number;
  y: number;
  size: number;
  /** Resting size; the focus reducer scales from this. */
  baseSize: number;
  /** Community tint (rgb string) — the primary fill. */
  color: string;
  /** Dimmed fill used when another node holds focus. */
  mutedColor: string;
  /** Type-based stroke, preserved for legibility (NodeBorderProgram). */
  borderColor: string;
  label: string;
  nodeType: string;
  community: number;
  orphan: boolean;
  /** Drives `defaultNodeType` → NodeBorderProgram. */
  type: "border";
}

export interface SigmaEdgeAttributes {
  size: number;
  color: string;
  /** Original edge label, kept so the reducer can surface it on focus only. */
  edgeLabel: string;
  label: string;
  /**
   * Bundling curvature consumed by @sigma/edge-curve when bundling is on. 0 for
   * a straight chord; the reducer flips the edge to the "curved" program only
   * when bundling is active.
   */
  curvature: number;
  type: "line" | "curved";
}

export interface BuildSigmaGraphParams {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: GraphLayout;
  sizeScales: Map<string, number>;
  orphanIds: Set<string>;
  dark?: boolean;
  edgeColor?: string;
  /**
   * Per-edge bundling curvature (sigma scene space), keyed by edge id. When
   * present and non-zero, the edge carries the value so the curve program can
   * bow it onto its bundle. Absent / 0 → straight edge.
   */
  bundledCurvatures?: Map<string, number>;
}

/**
 * Build a `graphology.Graph` ready to hand to a sigma instance: community tint
 * as fill, type colour as border, layout positions, degree-scaled sizes. This
 * is the adapter the issue asks to cover — it carries every visual contract
 * sigma's reducers later read.
 */
export function buildSigmaGraph(
  params: BuildSigmaGraphParams
): Graph<SigmaNodeAttributes, SigmaEdgeAttributes> {
  const {
    nodes,
    edges,
    layout,
    sizeScales,
    orphanIds,
    dark = true,
    edgeColor = "#3a424d",
    bundledCurvatures,
  } = params;

  const graph = new Graph<SigmaNodeAttributes, SigmaEdgeAttributes>({
    type: "directed",
    multi: true,
    allowSelfLoops: true,
  });

  for (const node of nodes) {
    if (graph.hasNode(node.id)) continue;
    const type = String(node.data.node_type ?? "node");
    const incomingScale = sizeScales.get(node.id) ?? 1;
    const pos = layout.get(node.id);
    const size = sigmaNodeSize(type, incomingScale);
    const fill = pos
      ? sigmaColorForCommunity(pos.community, dark)
      : colorForType(type);
    graph.addNode(node.id, {
      // Flip y so the WebGL scene matches the SVG fallback's downward growth.
      x: pos?.x ?? 50,
      y: -(pos?.y ?? 50),
      size,
      baseSize: size,
      color: fill,
      mutedColor: withAlpha(fill, 0.14),
      borderColor: colorForType(type),
      label: node.label,
      nodeType: type,
      community: pos?.community ?? -1,
      orphan: orphanIds.has(node.id),
      type: "border",
    });
  }

  for (const edge of edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    if (graph.hasEdge(edge.id)) continue;
    graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
      size: 1,
      color: withAlpha(edgeColor, 0.34),
      edgeLabel: edge.label ?? "",
      label: "",
      curvature: bundledCurvatures?.get(edge.id) ?? 0,
      type: "line",
    });
  }

  return graph;
}

// ─── focus neighbourhood (parity with the canvas focus highlight) ───────────

export interface GraphFocus {
  nodes: Set<string>;
  edges: Set<string>;
}

/**
 * The focused node plus its immediate neighbours and the edges between them —
 * the set the renderer keeps lit while everything else dims.
 */
export function computeGraphFocus(
  graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>,
  focusId: string | null
): GraphFocus {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  if (!focusId || !graph.hasNode(focusId)) return { nodes, edges };
  nodes.add(focusId);
  graph.forEachEdge(focusId, (edge, _attrs, source, target) => {
    edges.add(edge);
    nodes.add(source);
    nodes.add(target);
  });
  return { nodes, edges };
}

// ─── reducers (pure; the component closes over reactive state and delegates) ─

export interface SigmaReducerState {
  focusId: string | null;
  focus: GraphFocus;
  selectedNodeId: string | null;
  /** Focus-pulse progress, 0 (rest) → 1 (peak). Held at 0 for reduced motion. */
  pulse: number;
  colors: SigmaThemeColors;
  /** Edge bundling on → edges render through the curve program. */
  bundle: boolean;
}

export interface SigmaNodeDisplay {
  size: number;
  color: string;
  borderColor: string;
  label: string | null;
  forceLabel: boolean;
  zIndex: number;
  hidden: boolean;
}

export interface SigmaEdgeDisplay {
  size: number;
  color: string;
  label: string | null;
  forceLabel: boolean;
  zIndex: number;
  hidden: boolean;
  /** Which edge program draws this edge: straight "line" or bundled "curved". */
  type: "line" | "curved";
  /** Bow magnitude/sign for the curve program (ignored by the line program). */
  curvature: number;
}

const NODE_LABEL_MAX = 36;
const EDGE_LABEL_MAX = 28;
const NEIGHBOUR_LABEL_LIMIT = 36;

/** Per-node display override mirroring the old canvas draw loop's focus maths. */
export function reduceSigmaNode(
  id: string,
  attrs: SigmaNodeAttributes,
  state: SigmaReducerState
): SigmaNodeDisplay {
  const { focus, focusId, selectedNodeId, pulse, colors } = state;
  const hasFocus = focusId !== null;
  const isPrimary = focusId === id;
  const isNeighbor = focus.nodes.has(id);
  const lit = !hasFocus || isNeighbor;

  const scale = !hasFocus
    ? 1
    : isPrimary
      ? 2.2 + pulse * 0.38
      : isNeighbor
        ? 1.58
        : 0.9;

  const borderColor = isPrimary
    ? colors.focusNodeStroke
    : attrs.orphan
      ? colors.warn
      : selectedNodeId === id
        ? colors.selectedNodeStroke
        : attrs.borderColor;

  const showLabel =
    hasFocus &&
    (isPrimary || (focus.nodes.size <= NEIGHBOUR_LABEL_LIMIT && isNeighbor));

  return {
    size: attrs.baseSize * scale,
    color: lit ? attrs.color : attrs.mutedColor,
    borderColor,
    label: showLabel ? attrs.label.slice(0, NODE_LABEL_MAX) : "",
    forceLabel: showLabel,
    zIndex: isPrimary ? 3 : isNeighbor ? 2 : 1,
    hidden: false,
  };
}

/** Per-edge display override: dim everything, light up the focused fan + label. */
export function reduceSigmaEdge(
  id: string,
  attrs: SigmaEdgeAttributes,
  state: SigmaReducerState
): SigmaEdgeDisplay {
  const { focus, focusId, colors, bundle } = state;
  const hasFocus = focusId !== null;
  const focused = focus.edges.has(id);

  // The sigma edge reducer's return *replaces* the edge data, so type and
  // curvature must be carried through on every branch or the curve program
  // can't see them. Bundle off → always the straight line program.
  const curvature = attrs.curvature;
  const type: "line" | "curved" =
    bundle && Math.abs(curvature) > 1e-4 ? "curved" : "line";

  if (!hasFocus) {
    return {
      size: attrs.size,
      color: withAlpha(colors.edge, 0.34),
      label: "",
      forceLabel: false,
      zIndex: 0,
      hidden: false,
      type,
      curvature,
    };
  }

  if (focused) {
    return {
      size: 2.2,
      color: colors.focusEdge,
      label: attrs.edgeLabel ? attrs.edgeLabel.slice(0, EDGE_LABEL_MAX) : "",
      forceLabel: Boolean(attrs.edgeLabel),
      zIndex: 2,
      hidden: false,
      type,
      curvature,
    };
  }

  return {
    size: attrs.size,
    color: withAlpha(colors.edge, 0.055),
    label: "",
    forceLabel: false,
    zIndex: 0,
    hidden: false,
    type,
    curvature,
  };
}
