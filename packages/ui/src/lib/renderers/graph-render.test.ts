import { describe, expect, it } from "vitest";
import Graph from "graphology";
import leiden from "@aflsolutions/graphology-communities-leiden";
import louvain from "graphology-communities-louvain";
import type { QueryResult } from "#reddb";
import {
  assignGraphCommunities,
  compareGraphNodesByCentrality,
  extractGraph,
  graphNodeCentrality,
  graphNodeDetail,
  graphNodeIncomingSizeScales,
  graphNodeIsOrphan,
  hasGraphShape,
  renderGraphHtml,
  runGraphLayout,
  type GraphEdge,
  type GraphNode,
} from "./graph-render";

const FIXTURE: QueryResult = {
  ok: true,
  query: "MATCH (n)-[r]->(m) RETURN n, r, m",
  capability: "graph",
  record_count: 2,
  result: {
    columns: ["n", "r", "m"],
    records: [
      {
        values: {},
        nodes: {
          n: { id: "1", name: "Ada" },
          m: { id: "2", name: "Grace" },
        },
        edges: {
          r: { source: "1", target: "2", type: "KNOWS" },
        },
      },
      {
        values: {},
        nodes: {
          n: { id: "1", name: "Ada" },
          m: { id: "3", name: "Linus" },
        },
        edges: {
          r: { source: "1", target: "3", type: "KNOWS" },
        },
      },
    ],
  },
};

describe("hasGraphShape", () => {
  it("detects results with nodes/edges populated", () => {
    expect(hasGraphShape(FIXTURE)).toBe(true);
  });

  it("rejects plain table results", () => {
    const flat: QueryResult = {
      ok: true,
      query: "SELECT * FROM users",
      record_count: 1,
      result: { columns: ["id"], records: [{ values: { id: 1 } }] },
    };
    expect(hasGraphShape(flat)).toBe(false);
  });

  it("rejects empty results", () => {
    const empty: QueryResult = {
      ok: true,
      query: "",
      record_count: 0,
      result: { columns: [], records: [] },
    };
    expect(hasGraphShape(empty)).toBe(false);
  });
});

describe("extractGraph", () => {
  it("dedupes nodes by id across rows", () => {
    const { nodes, edges } = extractGraph(FIXTURE);
    expect(nodes.map((n) => n.id).sort()).toEqual(["1", "2", "3"]);
    expect(edges).toHaveLength(2);
  });

  it("uses name/label/title for node label, falls back to id", () => {
    const r: QueryResult = {
      ok: true,
      query: "",
      record_count: 1,
      result: {
        columns: ["n"],
        records: [
          {
            values: {},
            nodes: { n: { id: "abc" }, m: { id: "xyz", label: "X" } },
          },
        ],
      },
    };
    const { nodes } = extractGraph(r);
    expect(nodes.find((n) => n.id === "abc")?.label).toBe("abc");
    expect(nodes.find((n) => n.id === "xyz")?.label).toBe("X");
  });

  it("skips nodes/edges without an id or endpoints", () => {
    const r: QueryResult = {
      ok: true,
      query: "",
      record_count: 1,
      result: {
        columns: ["n"],
        records: [
          {
            values: {},
            nodes: { n: { name: "no-id" } },
            edges: { r: { source: "1" } },
          },
        ],
      },
    };
    const { nodes, edges } = extractGraph(r);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });
});

describe("graphNodeCentrality", () => {
  it("counts in/out degree and sorts higher-score nodes first", () => {
    const { nodes, edges } = extractGraph(FIXTURE);
    const centrality = graphNodeCentrality(nodes, edges);

    expect(centrality.get("1")).toMatchObject({
      degree: 2,
      outDegree: 2,
      inDegree: 0,
      score: 2,
    });
    expect(centrality.get("2")).toMatchObject({
      degree: 1,
      outDegree: 0,
      inDegree: 1,
      score: 1,
    });

    const sorted = [...nodes].sort((a, b) =>
      compareGraphNodesByCentrality(a, b, centrality)
    );
    expect(sorted.map((n) => n.label)).toEqual(["Ada", "Grace", "Linus"]);
  });

  it("uses explicit centrality scores when the server provides them", () => {
    const graph = {
      nodes: [
        {
          id: "1",
          label: "Low degree, high centrality",
          data: { centrality_score: 99 },
        },
        { id: "2", label: "High degree", data: {} },
        { id: "3", label: "Leaf", data: {} },
      ],
      edges: [{ id: "a", source: "2", target: "3" }],
    };
    const centrality = graphNodeCentrality(graph.nodes, graph.edges);
    const sorted = [...graph.nodes].sort((a, b) =>
      compareGraphNodesByCentrality(a, b, centrality)
    );

    expect(centrality.get("1")?.score).toBe(99);
    expect(sorted[0].id).toBe("1");
  });

  it("tiers node size from incoming edge count", () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      label: `n${i}`,
      data: {},
    }));
    const edges = nodes.flatMap((target, incoming) =>
      Array.from({ length: incoming }, (_, i) => ({
        id: `${i}->${target.id}`,
        source: "0",
        target: target.id,
      }))
    );
    const centrality = graphNodeCentrality(nodes, edges);
    const scales = graphNodeIncomingSizeScales(nodes, centrality);

    expect(scales.get("1")).toBe(1);
    expect(scales.get("5")).toBe(1.25);
    expect(scales.get("8")).toBe(1.5);
    expect(scales.get("9")).toBe(2);
  });
});

describe("graphNodeDetail", () => {
  it("reads description, exports, orphan flag, and directional contract edges", () => {
    const nodes: GraphNode[] = [
      {
        id: "1",
        label: "src/auth.ts",
        data: {
          node_type: "file",
          description: "auth module",
          exports: ["issueToken", "TokenStore"],
          orphan: true,
        },
      },
      { id: "2", label: "issueToken", data: { node_type: "symbol" } },
      { id: "3", label: "node:crypto", data: { node_type: "import" } },
      { id: "4", label: "verifyToken", data: { node_type: "symbol" } },
    ];
    const edges: GraphEdge[] = [
      {
        id: "defines",
        source: "1",
        target: "2",
        label: "DEFINED_IN",
        data: { kind: "defines", direction: "directed" },
      },
      {
        id: "imports",
        source: "1",
        target: "3",
        label: "IMPORTS",
        data: { kind: "imports", direction: "directed" },
      },
      {
        id: "references",
        source: "4",
        target: "2",
        label: "CALLS",
        data: { kind: "references", direction: "directed" },
      },
    ];
    const centrality = graphNodeCentrality(nodes, edges);
    const fileDetail = graphNodeDetail(nodes[0], nodes, edges, centrality);
    const symbolDetail = graphNodeDetail(nodes[1], nodes, edges, centrality);

    expect(fileDetail.description).toBe("auth module");
    expect(fileDetail.exports).toEqual(["issueToken", "TokenStore"]);
    expect(fileDetail.orphan).toBe(true);
    expect(fileDetail.outgoing.map((r) => [r.label, r.nodeLabel])).toEqual([
      ["defines", "issueToken"],
      ["imports", "node:crypto"],
    ]);
    expect(symbolDetail.whereUsed.map((r) => [r.label, r.nodeLabel])).toEqual([
      ["defined by", "src/auth.ts"],
      ["referenced by", "verifyToken"],
    ]);
  });

  it("falls back to inbound degree when no orphan flag is present", () => {
    const nodes: GraphNode[] = [
      { id: "root", label: "root", data: {} },
      { id: "child", label: "child", data: {} },
    ];
    const edges: GraphEdge[] = [{ id: "e", source: "root", target: "child" }];
    const centrality = graphNodeCentrality(nodes, edges);

    expect(graphNodeIsOrphan(nodes[0], centrality)).toBe(true);
    expect(graphNodeIsOrphan(nodes[1], centrality)).toBe(false);
  });
});

describe("runGraphLayout", () => {
  const makeNode = (id: string): GraphNode => ({ id, label: id, data: {} });
  const makeEdge = (source: string, target: string): GraphEdge => ({
    id: `${source}->${target}`,
    source,
    target,
  });

  it("returns empty map for empty input", () => {
    expect(runGraphLayout([], []).size).toBe(0);
  });

  it("places a single node at the centre", () => {
    const out = runGraphLayout([makeNode("a")], []);
    expect(out.get("a")).toEqual({ x: 50, y: 50, community: 0 });
  });

  it("outputs positions inside the [0, 100] viewport", () => {
    const nodes = Array.from({ length: 30 }, (_, i) => makeNode(`n${i}`));
    const edges: GraphEdge[] = [];
    for (let i = 0; i < nodes.length - 1; i++)
      edges.push(makeEdge(`n${i}`, `n${i + 1}`));
    const out = runGraphLayout(nodes, edges);
    for (const pos of out.values()) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(100);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(100);
    }
  });

  it("clusters communities spatially on a two-clique graph", () => {
    // Two K4 cliques joined by one bridge edge. Louvain should detect the
    // two communities and ForceAtlas2 should pull each clique together
    // while pushing them apart — intra-clique distance < cross-clique.
    const left = ["l1", "l2", "l3", "l4"];
    const right = ["r1", "r2", "r3", "r4"];
    const nodes = [...left, ...right].map(makeNode);
    const edges: GraphEdge[] = [];
    for (const a of left)
      for (const b of left) if (a < b) edges.push(makeEdge(a, b));
    for (const a of right)
      for (const b of right) if (a < b) edges.push(makeEdge(a, b));
    edges.push(makeEdge("l1", "r1"));

    const out = runGraphLayout(nodes, edges);
    const leftCommunities = new Set(left.map((id) => out.get(id)!.community));
    const rightCommunities = new Set(right.map((id) => out.get(id)!.community));
    expect(leftCommunities.size).toBe(1);
    expect(rightCommunities.size).toBe(1);
    expect([...leftCommunities][0]).not.toBe([...rightCommunities][0]);

    const dist = (a: string, b: string) => {
      const pa = out.get(a)!;
      const pb = out.get(b)!;
      return Math.hypot(pa.x - pb.x, pa.y - pb.y);
    };
    let intra = 0;
    let intraN = 0;
    for (const group of [left, right]) {
      for (const a of group)
        for (const b of group)
          if (a < b) {
            intra += dist(a, b);
            intraN++;
          }
    }
    let cross = 0;
    let crossN = 0;
    for (const a of left)
      for (const b of right) {
        cross += dist(a, b);
        crossN++;
      }
    expect(intra / intraN).toBeLessThan(cross / crossN);
  });

  it("is deterministic across runs (seeded RNG)", () => {
    const nodes = Array.from({ length: 10 }, (_, i) => makeNode(`n${i}`));
    const edges: GraphEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if ((i + j) % 3 === 0) edges.push(makeEdge(`n${i}`, `n${j}`));
      }
    }
    const a = runGraphLayout(nodes, edges);
    const b = runGraphLayout(nodes, edges);
    for (const id of a.keys()) expect(a.get(id)).toEqual(b.get(id));
  });
});

describe("assignGraphCommunities (Leiden, Louvain fallback)", () => {
  // Mulberry32 — deterministic seed so the fixture and the algorithms render
  // the same partition on every run.
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
   * A planted-partition graph: `groups` dense clusters of `perGroup` nodes,
   * wired into a ring inside each group (guaranteeing intra-group reach) plus
   * extra random intra-group edges, joined by a handful of cross-group
   * bridges. Representative of the clustered topology graphs we render.
   */
  function plantedPartition(groups: number, perGroup: number): Graph {
    const g = new Graph({ type: "undirected", multi: false });
    const rng = seededRng(1337);
    for (let gi = 0; gi < groups; gi++) {
      for (let i = 0; i < perGroup; i++) g.addNode(`g${gi}_n${i}`);
    }
    for (let gi = 0; gi < groups; gi++) {
      const ids = Array.from({ length: perGroup }, (_, i) => `g${gi}_n${i}`);
      // Ring spine keeps each group connected.
      for (let i = 0; i < ids.length; i++) {
        const a = ids[i];
        const b = ids[(i + 1) % ids.length];
        if (!g.hasEdge(a, b)) g.addEdge(a, b);
      }
      // Extra intra-group density.
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          if (rng() < 0.45 && !g.hasEdge(ids[i], ids[j]))
            g.addEdge(ids[i], ids[j]);
        }
      }
    }
    // Sparse cross-group bridges.
    for (let gi = 0; gi < groups; gi++) {
      const next = (gi + 1) % groups;
      const a = `g${gi}_n0`;
      const b = `g${next}_n${perGroup - 1}`;
      if (!g.hasEdge(a, b)) g.addEdge(a, b);
    }
    return g;
  }

  /** Group node ids by their assigned `community` attribute. */
  function communitiesOf(g: Graph): Map<number, string[]> {
    const byCommunity = new Map<number, string[]>();
    g.forEachNode((node, attrs) => {
      const c = attrs.community as number;
      const bucket = byCommunity.get(c);
      if (bucket) bucket.push(node);
      else byCommunity.set(c, [node]);
    });
    return byCommunity;
  }

  /**
   * True iff the subgraph induced by `members` is a single connected
   * component — the property Leiden guarantees and Louvain does not.
   */
  function inducedSubgraphConnected(g: Graph, members: string[]): boolean {
    if (members.length <= 1) return true;
    const inCommunity = new Set(members);
    const seen = new Set<string>([members[0]]);
    const stack = [members[0]];
    while (stack.length) {
      const node = stack.pop()!;
      g.forEachNeighbor(node, (neighbor) => {
        if (inCommunity.has(neighbor) && !seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push(neighbor);
        }
      });
    }
    return seen.size === members.length;
  }

  it("uses Leiden when the fork is available", () => {
    const g = plantedPartition(4, 8);
    expect(assignGraphCommunities(g, seededRng(7))).toBe("leiden");
    // Output contract: every node carries a numeric community.
    g.forEachNode((_, attrs) => {
      expect(typeof attrs.community).toBe("number");
    });
  });

  it("produces internally-connected communities (Leiden's guarantee)", () => {
    const g = plantedPartition(4, 8);
    assignGraphCommunities(g, seededRng(7));
    const byCommunity = communitiesOf(g);
    expect(byCommunity.size).toBeGreaterThan(1);
    for (const [community, members] of byCommunity) {
      expect(
        inducedSubgraphConnected(g, members),
        `community ${community} (${members.length} nodes) must be internally connected`
      ).toBe(true);
    }
  });

  it("records modularity vs Louvain on the same fixture", () => {
    const leidenGraph = plantedPartition(4, 8);
    const louvainGraph = plantedPartition(4, 8);
    const leidenOut = leiden.detailed(leidenGraph, { rng: seededRng(7) });
    const louvainOut = louvain.detailed(louvainGraph, { rng: seededRng(7) });

    // Recorded delta — surfaced in the test log for benchmark tracking.
    const delta = leidenOut.modularity - louvainOut.modularity;
    // eslint-disable-next-line no-console
    console.log(
      `[graph-layout] modularity — leiden=${leidenOut.modularity.toFixed(4)} ` +
        `louvain=${louvainOut.modularity.toFixed(4)} delta=${delta.toFixed(4)} ` +
        `(communities: leiden=${leidenOut.count} louvain=${louvainOut.count})`
    );

    // Both are real partitions on a clearly-clustered graph; Leiden must not
    // be materially worse than Louvain on modularity.
    expect(leidenOut.modularity).toBeGreaterThan(0.3);
    expect(louvainOut.modularity).toBeGreaterThan(0.3);
    expect(leidenOut.modularity).toBeGreaterThanOrEqual(
      louvainOut.modularity - 0.05
    );
  });

  it("falls back to Louvain when the Leiden import is missing", () => {
    const g = plantedPartition(3, 6);
    expect(assignGraphCommunities(g, seededRng(7), null)).toBe("louvain");
    g.forEachNode((_, attrs) => {
      expect(typeof attrs.community).toBe("number");
    });
  });

  it("falls back to Louvain when Leiden throws", () => {
    const g = plantedPartition(3, 6);
    const throwing = {
      assign() {
        throw new Error("simulated yanked fork");
      },
    };
    expect(assignGraphCommunities(g, seededRng(7), throwing)).toBe("louvain");
    g.forEachNode((_, attrs) => {
      expect(typeof attrs.community).toBe("number");
    });
  });
});

describe("renderGraphHtml (golden snapshot)", () => {
  it("matches the captured snapshot for the fixture", () => {
    expect(renderGraphHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<section class="graph"><header class="summary">3 nodes · 2 edges</header><ul class="nodes"><li class="node" data-id="1">Ada</li><li class="node" data-id="2">Grace</li><li class="node" data-id="3">Linus</li></ul><ul class="edges"><li class="edge">1 → [KNOWS] 2</li><li class="edge">1 → [KNOWS] 3</li></ul></section>"`
    );
  });
});
