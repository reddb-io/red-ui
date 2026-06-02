import { describe, expect, it } from "vitest";
import {
  BUNDLE_EDGE_LIMIT,
  bundleEdges,
  countEdgeCrossings,
  edgeCurvature,
  edgeInk,
  type BundleEdgeInput,
  type BundleNodePosition,
  type BundlePoint,
} from "./graph-bundle";

// A dense bipartite showcase: two facing columns wired all-to-all. Used for
// the structural assertions (every edge bows toward its compatible
// neighbours).
function bipartite(k: number): {
  nodes: BundleNodePosition[];
  edges: BundleEdgeInput[];
} {
  const nodes: BundleNodePosition[] = [];
  const edges: BundleEdgeInput[] = [];
  for (let i = 0; i < k; i++) {
    nodes.push({ id: `L${i}`, x: 0, y: (i / (k - 1)) * 100 });
    nodes.push({ id: `R${i}`, x: 100, y: (i / (k - 1)) * 100 });
  }
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      edges.push({ id: `L${i}->R${j}`, source: `L${i}`, target: `R${j}` });
    }
  }
  return { nodes, edges };
}

// Two clustered flows that cross: A(top-left)→B(bottom-right) over
// C(bottom-left)→D(top-right). Straight, every A→B line crosses every C→D
// line (~k² crossings); bundled, each flow collapses to a trunk and the two
// trunks cross only a handful of times — the textbook FDEB win.
function crossingFlows(k: number): {
  nodes: BundleNodePosition[];
  edges: BundleEdgeInput[];
} {
  const nodes: BundleNodePosition[] = [];
  const edges: BundleEdgeInput[] = [];
  for (let i = 0; i < k; i++) {
    // Flow 1: constant slope +1 (parallel, no internal crossings).
    nodes.push({ id: `A${i}`, x: 10, y: 8 + i * 1.5 });
    nodes.push({ id: `B${i}`, x: 90, y: 88 + i * 1.5 });
    // Flow 2: constant slope -1, crossing flow 1 as a whole.
    nodes.push({ id: `C${i}`, x: 10, y: 92 - i * 1.5 });
    nodes.push({ id: `D${i}`, x: 90, y: 12 - i * 1.5 });
    edges.push({ id: `A${i}->B${i}`, source: `A${i}`, target: `B${i}` });
    edges.push({ id: `C${i}->D${i}`, source: `C${i}`, target: `D${i}` });
  }
  return { nodes, edges };
}

function straightPolylines(
  nodes: BundleNodePosition[],
  edges: BundleEdgeInput[]
): BundlePoint[][] {
  const pos = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  return edges.map((e) => [pos.get(e.source)!, pos.get(e.target)!]);
}

describe("bundleEdges", () => {
  it("returns a polyline for every edge with endpoints preserved", () => {
    const nodes: BundleNodePosition[] = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 100, y: 0 },
    ];
    const edges: BundleEdgeInput[] = [{ id: "e", source: "a", target: "b" }];
    const bundled = bundleEdges(nodes, edges);
    const path = bundled.get("e")!;
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 100, y: 0 });
  });

  it("drops dangling edges and gives self-loops a straight stub", () => {
    const nodes: BundleNodePosition[] = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 10, y: 10 },
    ];
    const edges: BundleEdgeInput[] = [
      { id: "loop", source: "a", target: "a" },
      { id: "dangling", source: "a", target: "ghost" },
      { id: "ab", source: "a", target: "b" },
    ];
    const bundled = bundleEdges(nodes, edges);
    expect(bundled.has("dangling")).toBe(false);
    expect(bundled.get("loop")).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(bundled.get("ab")![0]).toEqual({ x: 0, y: 0 });
  });

  it("is deterministic — identical input yields identical output", () => {
    const { nodes, edges } = bipartite(5);
    const a = bundleEdges(nodes, edges);
    const b = bundleEdges(nodes, edges);
    for (const [id, path] of a) {
      expect(b.get(id)).toEqual(path);
    }
  });

  it("cuts edge ink (clutter) on dense crossing flows", () => {
    const { nodes, edges } = crossingFlows(7);
    const straightInk = edgeInk(straightPolylines(nodes, edges), 3);
    const bundledInk = edgeInk([...bundleEdges(nodes, edges).values()], 3);
    expect(straightInk).toBeGreaterThan(0);
    // FDEB collapses compatible edges onto shared trunks, so the painted area
    // (the hairball) drops meaningfully — the measurable bundling win.
    expect(bundledInk).toBeLessThan(straightInk * 0.75);
  });

  it("pulls compatible edges off their straight chords", () => {
    const { nodes, edges } = bipartite(4);
    const bundled = bundleEdges(nodes, edges);
    // The edge between the two middle-ish rows should bow away from its chord.
    const path = bundled.get("L0->R3")!;
    expect(path.length).toBeGreaterThan(2);
    const maxDev = Math.max(
      ...path.slice(1, -1).map((pt) => {
        // perpendicular distance to the straight chord (0,0)→(100,100)
        return Math.abs(pt.x - pt.y) / Math.SQRT2;
      })
    );
    expect(maxDev).toBeGreaterThan(0.5);
  });

  it("honours a reduced cycle/iteration budget without throwing", () => {
    const { nodes, edges } = bipartite(5);
    const bundled = bundleEdges(nodes, edges, { cycles: 2, iterations: 10 });
    expect(bundled.size).toBe(edges.length);
  });
});

describe("edgeCurvature", () => {
  it("is zero for straight or degenerate polylines", () => {
    expect(
      edgeCurvature([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ])
    ).toBe(0);
    expect(
      edgeCurvature([
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
      ])
    ).toBe(0);
  });

  it("signs the bow by which side of the chord the polyline bends", () => {
    const left = edgeCurvature([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ]);
    const right = edgeCurvature([
      { x: 0, y: 0 },
      { x: 5, y: -5 },
      { x: 10, y: 0 },
    ]);
    expect(left).toBeGreaterThan(0);
    expect(right).toBeLessThan(0);
    expect(left).toBeCloseTo(-right);
  });

  it("clamps extreme deviations into the [-1, 1] range", () => {
    const c = edgeCurvature([
      { x: 0, y: 0 },
      { x: 5, y: 100 },
      { x: 10, y: 0 },
    ]);
    expect(c).toBeLessThanOrEqual(1);
    expect(c).toBeGreaterThanOrEqual(-1);
  });
});

describe("countEdgeCrossings", () => {
  it("counts a single proper crossing", () => {
    const polylines: BundlePoint[][] = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ],
    ];
    expect(countEdgeCrossings(polylines)).toBe(1);
  });

  it("does not count edges that merely share a node endpoint", () => {
    const polylines: BundlePoint[][] = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      [
        { x: 0, y: 0 },
        { x: 10, y: -10 },
      ],
    ];
    expect(countEdgeCrossings(polylines)).toBe(0);
  });
});

describe("edgeInk", () => {
  it("counts the distinct grid cells a polyline paints", () => {
    // A 10-long horizontal segment at cell size 5 lands in cells 0 and 1.
    const ink = edgeInk(
      [
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      ],
      5
    );
    expect(ink).toBeGreaterThanOrEqual(2);
  });

  it("counts overlapping edges' shared cells once", () => {
    const single = edgeInk(
      [
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
        ],
      ],
      5
    );
    const overlapping = edgeInk(
      [
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
        ],
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
        ],
      ],
      5
    );
    // Two coincident edges paint no more cells than one.
    expect(overlapping).toBe(single);
  });
});

describe("BUNDLE_EDGE_LIMIT", () => {
  it("is a sane positive cap", () => {
    expect(BUNDLE_EDGE_LIMIT).toBeGreaterThan(0);
  });
});
