import { describe, it, expect } from "vitest";
import type { QueryResult } from "#reddb";
import { renderGraphHtml } from "./graph-render";
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

describe("renderGraphHtml (golden snapshot)", () => {
  it("matches the captured snapshot for the fixture", () => {
    expect(renderGraphHtml(FIXTURE)).toMatchInlineSnapshot(
      `"<section class="graph"><header class="summary">3 nodes · 2 edges</header><ul class="nodes"><li class="node" data-id="1">Ada</li><li class="node" data-id="2">Grace</li><li class="node" data-id="3">Linus</li></ul><ul class="edges"><li class="edge">1 → [KNOWS] 2</li><li class="edge">1 → [KNOWS] 3</li></ul></section>"`
    );
  });
});
