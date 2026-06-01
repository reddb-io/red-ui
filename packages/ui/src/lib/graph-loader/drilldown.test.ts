import { describe, expect, it } from "vitest";
import { extractGraph } from "$lib/renderers/graph-render";
import { parseGraphExport } from "./contract";
import { buildGraphDrilldown, graphResultForNodeIds } from "./drilldown";

function sampleGraph() {
  return parseGraphExport({
    version: "1.0",
    graph: {
      nodes: [
        {
          id: "api.user.controller",
          label: "UserController",
          layer: "api",
          component: "users",
          type: "class",
        },
        {
          id: "api.user.service",
          label: "UserService",
          layer: "api",
          component: "users",
          type: "class",
        },
        {
          id: "api.billing",
          label: "BillingApi",
          layer: "api",
          component: "billing",
          type: "class",
        },
        {
          id: "storage.engine",
          label: "StorageEngine",
          layer: "storage",
          component: "engine",
          type: "class",
        },
        {
          id: "runtime",
          label: "Runtime",
          community: 7,
          module: "runtime",
          type: "process",
        },
      ],
      edges: [
        {
          source: "api.user.controller",
          target: "api.user.service",
          type: "calls",
        },
        { source: "api.user.service", target: "api.billing", type: "calls" },
        { source: "api.billing", target: "storage.engine", type: "persists" },
        { source: "runtime", target: "api.user.controller", type: "starts" },
      ],
    },
    communities: [{ id: 7, label: "Runtime community", color: "#ff2056" }],
  });
}

describe("buildGraphDrilldown", () => {
  it("groups overview rows by explicit layer with connection counts", () => {
    const drilldown = buildGraphDrilldown(sampleGraph().model);
    const api = drilldown.layers.find((layer) => layer.label === "api");

    expect(drilldown.layers.map((layer) => layer.label)).toEqual([
      "api",
      "Runtime community",
      "storage",
    ]);
    expect(api).toMatchObject({
      nodeCount: 3,
      componentCount: 2,
      connectionCount: 4,
      internalConnectionCount: 2,
      externalConnectionCount: 2,
    });
  });

  it("reveals components inside a layer and nodes inside a component", () => {
    const api = buildGraphDrilldown(sampleGraph().model).layers.find(
      (layer) => layer.label === "api"
    );
    const users = api?.components.find(
      (component) => component.label === "users"
    );

    expect(api?.components.map((component) => component.label)).toEqual([
      "users",
      "billing",
    ]);
    expect(users).toMatchObject({
      nodeCount: 2,
      connectionCount: 3,
      internalConnectionCount: 1,
      externalConnectionCount: 2,
    });
    expect(users?.nodes.map((node) => node.label)).toEqual([
      "UserController",
      "UserService",
    ]);
  });

  it("falls back to contract communities when no explicit layer exists", () => {
    const community = buildGraphDrilldown(sampleGraph().model).layers.find(
      (layer) => layer.id === "community:7"
    );

    expect(community).toMatchObject({
      label: "Runtime community",
      color: "#ff2056",
      nodeCount: 1,
    });
  });

  it("sanitizes graph-provided community colors before sidebar rendering", () => {
    const loaded = parseGraphExport({
      version: "1.0",
      graph: {
        nodes: [{ id: "x", community: 1 }],
        edges: [],
      },
      communities: [
        {
          id: 1,
          label: "Injected",
          color: "red; background:url(https://example.test/beacon)",
        },
      ],
    });

    expect(buildGraphDrilldown(loaded.model).layers[0].color).toBe("#94a3b8");
  });
});

describe("graphResultForNodeIds", () => {
  it("filters the loaded graph to the selected node ids and internal edges", () => {
    const loaded = sampleGraph();
    const result = graphResultForNodeIds(loaded.model, [
      "api.user.controller",
      "api.user.service",
    ]);
    const graph = extractGraph(result);

    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "api.user.controller",
      "api.user.service",
    ]);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      source: "api.user.controller",
      target: "api.user.service",
      label: "calls",
    });
  });
});
