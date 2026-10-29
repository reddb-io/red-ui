import {describe,it,expect} from "vitest";
import {extractGraph,hasGraphShape,graphQuery,graphQueryResult} from "./graph-results";
import type {QueryResult} from "./client";
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


it('quotes graph operands without changing free-form host queries',()=>{expect(graphQuery({kind:'neighborhood',node:"O'Brien"})).toBe("GRAPH NEIGHBORHOOD 'O''Brien' DEPTH 1");expect(graphQuery({kind:'path',from:" x' ",to:'y'})).toBe("GRAPH SHORTEST_PATH 'x''' TO 'y'");expect(graphQuery({kind:'query',query:'MATCH (n) RETURN n'})).toBe('MATCH (n) RETURN n');});

const algorithmResult = (values: Record<string, unknown>[]): QueryResult => ({ok:true,query:'GRAPH',record_count:values.length,result:{columns:[],records:values.map(value=>({values:value}))}});
it('preserves actual RedDB MATCH relationship types',()=>{
 const graph=extractGraph({...FIXTURE,result:{...FIXTURE.result,records:[{values:{},nodes:{a:{id:'1'},b:{id:'2'}},edges:{r:{from:'1',to:'2',edge_type:'knows'}}}]}});
 expect(graph.edges[0]?.label).toBe('knows');
});
it('maps materialized centrality and neighborhood rows without discarding the loaded relationships',()=>{
 const previous=extractGraph(FIXTURE);
 const result=graphQueryResult(algorithmResult([{node_id:'1',label:'Ada',score:.75},{node_id:'2',label:'Grace',score:.25}]),previous);
 expect(result.nodes[0]?.data.score).toBe(.75);expect(result.edges).toHaveLength(1);
 expect(graphQueryResult(algorithmResult([{node_id:'1',depth:0}]),previous).edges).toHaveLength(0);
});
it('announces path metrics without inventing a path geometry',()=>{
 const previous=extractGraph(FIXTURE);
 const result=graphQueryResult(algorithmResult([{path_found:true,hop_count:2,total_weight:3}]),previous);
 expect(result.nodes).toBe(previous.nodes);expect(result.summary).toContain('2 hops');expect(result.summary).toContain('metrics only');
 expect(graphQueryResult(algorithmResult([{path_found:false}]),previous).summary).toContain('No path found');
 expect(()=>graphQueryResult(algorithmResult([{count:3}]),previous)).toThrow('table renderer');
});
