import { describe, expect, it } from "vitest";
import {
  buildSigmaGraph,
  colorForType,
  computeGraphFocus,
  FOCUS_EDGE_COLOR,
  FOCUS_NODE_STROKE_COLOR,
  nodeVisualRadius,
  reduceSigmaEdge,
  reduceSigmaNode,
  sigmaColorForCommunity,
  sigmaNodeSize,
  withAlpha,
  type SigmaReducerState,
  type SigmaThemeColors,
} from "./graph-sigma";
import type { GraphEdge, GraphLayout, GraphNode } from "./graph-render";

const THEME: SigmaThemeColors = {
  background: "#050607",
  edge: "#3a424d",
  focusEdge: FOCUS_EDGE_COLOR,
  focusNodeStroke: FOCUS_NODE_STROKE_COLOR,
  selectedNodeStroke: "#0a0a0b",
  nodeStroke: "#ffffff",
  warn: "#fbbf24",
};

function node(
  id: string,
  type = "node",
  data: Record<string, unknown> = {}
): GraphNode {
  return { id, label: id, data: { node_type: type, ...data } };
}

function edge(source: string, target: string, label?: string): GraphEdge {
  return { id: `${source}->${target}:${label ?? ""}`, source, target, label };
}

function layoutFor(ids: string[]): GraphLayout {
  const out: GraphLayout = new Map();
  ids.forEach((id, i) =>
    out.set(id, { x: 10 + i * 5, y: 20 + i * 4, community: i % 3 })
  );
  return out;
}

const baseState = (
  over: Partial<SigmaReducerState> = {}
): SigmaReducerState => ({
  focusId: null,
  focus: { nodes: new Set(), edges: new Set() },
  selectedNodeId: null,
  pulse: 0,
  colors: THEME,
  ...over,
});

describe("colour utilities", () => {
  it("maps node types to their literal palette", () => {
    expect(colorForType("tale")).toBe("#ff2056");
    expect(colorForType("character")).toBe("#7dd3fc");
    expect(colorForType("mystery-type")).toBe("#94a3b8");
  });

  it("converts community hsl tints into sigma-parseable rgb", () => {
    const rgb = sigmaColorForCommunity(0);
    expect(rgb).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  it("adds alpha to hex, rgb, and hsl colours", () => {
    expect(withAlpha("#ff2056", 0.5)).toBe("rgba(255, 32, 86, 0.5)");
    expect(withAlpha("rgb(58, 66, 77)", 0.34)).toBe("rgba(58, 66, 77, 0.34)");
    expect(withAlpha("hsl(200 62% 60%)", 0.1)).toMatch(
      /^rgba\(\d+, \d+, \d+, 0\.1\)$/
    );
  });

  it("scales node size monotonically with incoming weight", () => {
    expect(sigmaNodeSize("tale", 1)).toBeCloseTo(
      nodeVisualRadius("tale", 1) * 3.4
    );
    expect(sigmaNodeSize("character", 2)).toBeGreaterThan(
      sigmaNodeSize("character", 1)
    );
  });
});

describe("buildSigmaGraph", () => {
  const nodes = [
    node("a", "tale"),
    node("b", "character"),
    node("c", "location"),
  ];
  const edges = [edge("a", "b", "KNOWS"), edge("b", "c", "AT")];
  const params = {
    nodes,
    edges,
    layout: layoutFor(["a", "b", "c"]),
    sizeScales: new Map([
      ["a", 2],
      ["b", 1],
      ["c", 1],
    ]),
    orphanIds: new Set(["c"]),
  };

  it("places every node with community fill and type border", () => {
    const g = buildSigmaGraph(params);
    expect(g.order).toBe(3);
    expect(g.size).toBe(2);

    const a = g.getNodeAttributes("a");
    expect(a.color).toMatch(/^rgb\(/); // community tint, parseable by sigma
    expect(a.borderColor).toBe("#ff2056"); // type stroke preserved
    expect(a.x).toBe(10);
    expect(a.y).toBe(-20); // y is flipped to match the SVG fallback
    expect(a.type).toBe("border");
  });

  it("flags orphans and scales hub size from incoming weight", () => {
    const g = buildSigmaGraph(params);
    expect(g.getNodeAttributes("c").orphan).toBe(true);
    expect(g.getNodeAttributes("a").orphan).toBe(false);
    // a has incoming scale 2 → larger resting size than the unit-scaled b
    expect(g.getNodeAttributes("a").baseSize).toBeGreaterThan(
      g.getNodeAttributes("b").baseSize
    );
  });

  it("keeps edge labels on the attributes but hidden until focus", () => {
    const g = buildSigmaGraph(params);
    const e = g.getEdgeAttributes("a->b:KNOWS");
    expect(e.edgeLabel).toBe("KNOWS");
    expect(e.label).toBe(""); // not shown until the edge is focused
    expect(e.type).toBe("line");
  });

  it("drops edges whose endpoints were filtered out", () => {
    const g = buildSigmaGraph({
      ...params,
      edges: [...edges, edge("a", "ghost", "DANGLING")],
    });
    expect(g.size).toBe(2);
  });

  it("falls back to type colour when a node has no layout position", () => {
    const g = buildSigmaGraph({ ...params, layout: new Map() });
    expect(g.getNodeAttributes("a").color).toBe("#ff2056");
  });
});

describe("computeGraphFocus", () => {
  it("returns empty sets without a focus node", () => {
    const g = buildSigmaGraph({
      nodes: [node("a"), node("b")],
      edges: [edge("a", "b")],
      layout: layoutFor(["a", "b"]),
      sizeScales: new Map(),
      orphanIds: new Set(),
    });
    const focus = computeGraphFocus(g, null);
    expect(focus.nodes.size).toBe(0);
    expect(focus.edges.size).toBe(0);
  });

  it("collects the focused node, its neighbours, and incident edges", () => {
    const g = buildSigmaGraph({
      nodes: [node("a"), node("b"), node("c"), node("d")],
      edges: [edge("a", "b"), edge("c", "a"), edge("b", "d")],
      layout: layoutFor(["a", "b", "c", "d"]),
      sizeScales: new Map(),
      orphanIds: new Set(),
    });
    const focus = computeGraphFocus(g, "a");
    expect([...focus.nodes].sort()).toEqual(["a", "b", "c"]);
    expect(focus.edges.has("a->b:")).toBe(true);
    expect(focus.edges.has("c->a:")).toBe(true);
    expect(focus.edges.has("b->d:")).toBe(false);
  });

  it("is empty when the focus id is no longer in the graph", () => {
    const g = buildSigmaGraph({
      nodes: [node("a")],
      edges: [],
      layout: layoutFor(["a"]),
      sizeScales: new Map(),
      orphanIds: new Set(),
    });
    expect(computeGraphFocus(g, "gone").nodes.size).toBe(0);
  });
});

describe("reduceSigmaNode", () => {
  const attrs = {
    x: 0,
    y: 0,
    size: 10,
    baseSize: 10,
    color: "rgb(100, 150, 200)",
    mutedColor: "rgba(100, 150, 200, 0.14)",
    borderColor: "#7dd3fc",
    label: "Ada Lovelace the first programmer of the analytical engine",
    nodeType: "character",
    community: 1,
    orphan: false,
    type: "border" as const,
  };

  it("leaves nodes at rest size with no labels when nothing is focused", () => {
    const out = reduceSigmaNode("a", attrs, baseState());
    expect(out.size).toBe(10);
    expect(out.color).toBe(attrs.color);
    expect(out.borderColor).toBe("#7dd3fc"); // type stroke
    expect(out.label).toBe("");
    expect(out.forceLabel).toBe(false);
  });

  it("enlarges the primary focus node and forces its (truncated) label", () => {
    const state = baseState({
      focusId: "a",
      focus: { nodes: new Set(["a", "b"]), edges: new Set() },
      pulse: 1,
    });
    const out = reduceSigmaNode("a", attrs, state);
    expect(out.size).toBeCloseTo(10 * (2.2 + 0.38));
    expect(out.borderColor).toBe(FOCUS_NODE_STROKE_COLOR);
    expect(out.forceLabel).toBe(true);
    expect(out.label?.length).toBe(36);
  });

  it("dims and mutes nodes outside the focus neighbourhood", () => {
    const state = baseState({
      focusId: "a",
      focus: { nodes: new Set(["a"]), edges: new Set() },
    });
    const out = reduceSigmaNode("z", attrs, state);
    expect(out.color).toBe(attrs.mutedColor);
    expect(out.size).toBeCloseTo(10 * 0.9);
    expect(out.label).toBe("");
  });

  it("paints the selection and orphan strokes when unfocused", () => {
    const selected = reduceSigmaNode(
      "a",
      attrs,
      baseState({ selectedNodeId: "a" })
    );
    expect(selected.borderColor).toBe(THEME.selectedNodeStroke);

    const orphan = reduceSigmaNode(
      "a",
      { ...attrs, orphan: true },
      baseState()
    );
    expect(orphan.borderColor).toBe(THEME.warn);
  });

  it("hides neighbour labels once the neighbourhood grows past the limit", () => {
    const big = new Set(Array.from({ length: 40 }, (_, i) => `n${i}`));
    big.add("a");
    const out = reduceSigmaNode(
      "n1",
      attrs,
      baseState({ focusId: "a", focus: { nodes: big, edges: new Set() } })
    );
    expect(out.label).toBe("");
  });
});

describe("reduceSigmaEdge", () => {
  const attrs = {
    size: 1,
    color: "rgba(58, 66, 77, 0.34)",
    edgeLabel: "DEPENDS_ON",
    label: "",
    type: "line" as const,
  };

  it("renders resting edges faint and unlabelled", () => {
    const out = reduceSigmaEdge("e", attrs, baseState());
    expect(out.label).toBe("");
    expect(out.color).toBe(withAlpha(THEME.edge, 0.34));
  });

  it("lights the focused fan and surfaces its label", () => {
    const state = baseState({
      focusId: "a",
      focus: { nodes: new Set(["a"]), edges: new Set(["e"]) },
    });
    const out = reduceSigmaEdge("e", attrs, state);
    expect(out.color).toBe(FOCUS_EDGE_COLOR);
    expect(out.size).toBeGreaterThan(attrs.size);
    expect(out.label).toBe("DEPENDS_ON");
    expect(out.forceLabel).toBe(true);
  });

  it("fades edges outside the focus fan to near-invisible", () => {
    const state = baseState({
      focusId: "a",
      focus: { nodes: new Set(["a"]), edges: new Set(["other"]) },
    });
    const out = reduceSigmaEdge("e", attrs, state);
    expect(out.color).toBe(withAlpha(THEME.edge, 0.055));
    expect(out.label).toBe("");
  });
});
