import { describe, expect, it } from "vitest";
import {
  collapseCommunities,
  communitiesInLayout,
  communitySupernodeId,
  isSupernodeId,
  supernodeCommunityOf,
} from "./graph-communities";
import type { GraphEdge, GraphLayout, GraphNode } from "./graph-render";

function node(id: string): GraphNode {
  return { id, label: id, data: {} };
}

function edge(source: string, target: string, label?: string): GraphEdge {
  return { id: `${source}->${target}:${label ?? ""}`, source, target, label };
}

// Two communities: {a, b} = community 0, {c, d} = community 1.
function fixture(): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: GraphLayout;
} {
  const nodes = ["a", "b", "c", "d"].map(node);
  const edges = [
    edge("a", "b", "IN0"), // intra community 0
    edge("c", "d", "IN1"), // intra community 1
    edge("a", "c", "CROSS"), // cross 0 → 1
    edge("b", "c", "CROSS"), // cross 0 → 1 (parallel after collapse)
  ];
  const layout: GraphLayout = new Map([
    ["a", { x: 10, y: 10, community: 0 }],
    ["b", { x: 20, y: 30, community: 0 }],
    ["c", { x: 80, y: 80, community: 1 }],
    ["d", { x: 90, y: 60, community: 1 }],
  ]);
  return { nodes, edges, layout };
}

describe("supernode id helpers", () => {
  it("round-trips a community id through the synthetic namespace", () => {
    const id = communitySupernodeId(7);
    expect(isSupernodeId(id)).toBe(true);
    expect(supernodeCommunityOf(id)).toBe(7);
  });

  it("rejects ordinary node ids", () => {
    expect(isSupernodeId("a")).toBe(false);
    expect(supernodeCommunityOf("a")).toBe(null);
  });
});

describe("communitiesInLayout", () => {
  it("buckets nodes by their layout community", () => {
    const { nodes, layout } = fixture();
    const groups = communitiesInLayout(nodes, layout);
    expect(groups.get(0)?.sort()).toEqual(["a", "b"]);
    expect(groups.get(1)?.sort()).toEqual(["c", "d"]);
  });
});

describe("collapseCommunities", () => {
  it("is a no-op when nothing is collapsed (same references)", () => {
    const { nodes, edges, layout } = fixture();
    const out = collapseCommunities(nodes, edges, layout, new Set());
    expect(out.nodes).toBe(nodes);
    expect(out.edges).toBe(edges);
    expect(out.supernodes.size).toBe(0);
  });

  it("folds one community into a centroid-positioned supernode", () => {
    const { nodes, edges, layout } = fixture();
    const out = collapseCommunities(nodes, edges, layout, new Set([0]));

    // a, b removed; one supernode added; c, d remain.
    const ids = out.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["__cluster__:0", "c", "d"]);

    const superId = communitySupernodeId(0);
    const summary = out.supernodes.get(superId);
    expect(summary?.size).toBe(2);
    expect(summary?.memberIds.sort()).toEqual(["a", "b"]);

    // centroid of (10,10) and (20,30) = (15, 20)
    const pos = out.layout.get(superId);
    expect(pos).toEqual({ x: 15, y: 20, community: 0 });

    expect([...out.collapsedMembers.keys()].sort()).toEqual(["a", "b"]);
  });

  it("drops intra-cluster edges and aggregates parallel crossings", () => {
    const { nodes, edges, layout } = fixture();
    const out = collapseCommunities(nodes, edges, layout, new Set([0]));

    // IN0 (a→b) is now inside the supernode → gone.
    // IN1 (c→d) untouched → passes through unchanged.
    // a→c and b→c both become __cluster__:0 → c, merged into one weight-2 edge.
    const passthrough = out.edges.find((e) => e.id === "c->d:IN1");
    expect(passthrough).toBeDefined();
    expect(passthrough?.label).toBe("IN1");

    const internal = out.edges.find((e) => e.source === e.target);
    expect(internal).toBeUndefined();

    const agg = out.edges.filter((e) => e.data?.__aggregated);
    expect(agg).toHaveLength(1);
    expect(agg[0].source).toBe(communitySupernodeId(0));
    expect(agg[0].target).toBe("c");
    expect(agg[0].data?.weight).toBe(2);
    expect(agg[0].label).toBe("×2");
  });

  it("collapses both communities into a single cross edge between supernodes", () => {
    const { nodes, edges, layout } = fixture();
    const out = collapseCommunities(nodes, edges, layout, new Set([0, 1]));

    expect(out.nodes.map((n) => n.id).sort()).toEqual([
      "__cluster__:0",
      "__cluster__:1",
    ]);
    // All four edges collapse: 2 intra dropped, 2 cross merged → weight 2.
    expect(out.edges).toHaveLength(1);
    expect(out.edges[0].source).toBe(communitySupernodeId(0));
    expect(out.edges[0].target).toBe(communitySupernodeId(1));
    expect(out.edges[0].data?.weight).toBe(2);
  });

  it("ignores a collapsed id with no members in the current draw set", () => {
    const { nodes, edges, layout } = fixture();
    const out = collapseCommunities(nodes, edges, layout, new Set([99]));
    expect(out.nodes).toBe(nodes);
    expect(out.supernodes.size).toBe(0);
  });

  it("is reversible — expanding restores the original node set", () => {
    const { nodes, edges, layout } = fixture();
    const collapsedOut = collapseCommunities(
      nodes,
      edges,
      layout,
      new Set([0])
    );
    expect(collapsedOut.nodes.length).toBe(3);
    const expandedOut = collapseCommunities(nodes, edges, layout, new Set());
    expect(expandedOut.nodes.map((n) => n.id).sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});
