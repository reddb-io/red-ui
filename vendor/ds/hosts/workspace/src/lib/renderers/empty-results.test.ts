import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import type { Component } from "svelte";
import type { QueryResult } from "../reddb/index";
import Table from "./TableRenderer.svelte";
import Graph from "./GraphRenderer.svelte";
import Queue from "./QueueRenderer.svelte";
import Document from "./DocumentRenderer.svelte";

const empty: QueryResult = {
  ok: true,
  query: "SELECT * FROM empty_records",
  record_count: 0,
  result: { columns: [], records: [] },
};
for (const [surface, component, asset, title] of [
  ["table", Table, "table-empty-compact", "No rows returned"],
  ["graph", Graph, "graph-empty-compact", "No graph data returned"],
  ["queue", Queue, "queue-empty-compact", "No queue messages returned"],
  [
    "document",
    Document,
    "document-collection-empty-compact",
    "No documents returned",
  ],
] as const)
  describe(`${surface} empty result`, () => {
    it("renders the canonical compact artwork without fabricating records", () => {
      const { body } = render(component as Component<any>, {
        props: { result: empty, collection: "empty_records" },
      });
      expect(body).toContain(`data-renderer-empty="${surface}"`);
      expect(body).toContain(`data-state-illustration="${asset}"`);
      expect(body).toContain(title);
      expect(body).toContain('aria-hidden="true"');
      expect(body).not.toContain("Loading");
    });
    it("keeps a failed query distinct from empty data", () => {
      const { body } = render(component as Component<any>, {
        props: { result: { ...empty, ok: false, error: "Read denied" } },
      });
      expect(body).toContain('role="alert"');
      expect(body).toContain("Read denied");
      expect(body).not.toContain("data-renderer-empty");
    });
  });
it("does not call records without graph fields an empty graph", () => {
  const result = {
    ...empty,
    record_count: 1,
    result: {
      columns: ["name"],
      records: [{ values: { name: "record without graph fields" } }],
    },
  };
  const { body } = render(Graph, { props: { result } });
  expect(body).toContain('data-empty-reason="unsupported"');
  expect(body).toContain("No graph data in this result");
});
it("offers a read-only command view for an empty queue", () => {
  const { body } = render(Queue, {
    props: { result: empty, collection: "empty_messages" },
  });
  expect(body).toContain("View queue commands");
  expect(body).not.toContain("Create sample");
});
