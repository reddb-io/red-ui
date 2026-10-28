import { afterEach, describe, expect, it } from "vitest";
import { mount, tick, unmount } from "svelte";
import type { Component } from "svelte";
import type { QueryResult } from "#reddb";
import Table from "./TableRenderer.svelte";
import Queue from "./QueueRenderer.svelte";
import Document from "./DocumentRenderer.svelte";

const mounted: ReturnType<typeof mount>[] = [];
function render(
  component: Component<any>,
  result: QueryResult,
  collection?: string
) {
  const target = document.createElement("div");
  document.body.append(target);
  mounted.push(mount(component, { target, props: { result, collection } }));
  return target;
}
const result = (
  values: Record<string, unknown>,
  capability: string
): QueryResult => ({
  ok: true,
  query: "SELECT * FROM records",
  capability,
  record_count: 1,
  result: { columns: Object.keys(values), records: [{ values }] },
});
async function flush() {
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
}
afterEach(async () => {
  for (const component of mounted.splice(0)) await unmount(component);
  document.body.innerHTML = "";
});

it("keeps table column filters visible and clears an unmatched filter with focus recovery", async () => {
  const target = render(
    Table,
    result({ id: "row-1", name: "Stored row" }, "table")
  );
  const toggle = target.querySelector<HTMLButtonElement>(
    "[data-table-filter-toggle]"
  )!;
  toggle.click();
  await flush();
  const input = target.querySelector<HTMLInputElement>(
    "[data-table-filters] input"
  )!;
  input.value = "missing";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(target.querySelector('[data-empty-reason="filtered"]')).not.toBeNull();
  expect(target.querySelector("[data-table-filters] input")).not.toBeNull();
  const clear = Array.from(target.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Clear filters"
  )!;
  clear.click();
  await flush();
  expect(target.querySelector('[data-empty-reason="filtered"]')).toBeNull();
  expect(target.textContent).toContain("Stored row");
  expect(document.activeElement).toBe(toggle);
});
it("clears an unmatched document search and returns focus to its input", async () => {
  const target = render(
    Document,
    result(
      {
        rid: "doc-1",
        kind: "document",
        body: { title: "Stored document", text: "Text" },
      },
      "document"
    )
  );
  const input = target.querySelector<HTMLInputElement>(
    "[data-document-filter]"
  )!;
  expect(input).not.toBeNull();
  input.value = "missing";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(target.querySelector('[data-empty-reason="filtered"]')).not.toBeNull();
  const clear = Array.from(target.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Clear document filter"
  )!;
  clear.click();
  await flush();
  expect(input.value).toBe("");
  expect(document.activeElement).toBe(input);
  expect(target.querySelector('[data-empty-reason="filtered"]')).toBeNull();
});
it("distinguishes queue payloads without event envelopes and recovers an empty filter", async () => {
  const target = render(
    Queue,
    result(
      { message_id: "message-1", message: { type: "stored" }, state: "ready" },
      "queue"
    ),
    "messages"
  );
  expect(target.textContent).toContain("No event envelopes in these messages");
  const view = Array.from(target.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "View messages"
  )!;
  view.click();
  await flush();
  expect(document.activeElement).toBe(
    target.querySelector('[data-queue-mode="messages"]')
  );
  const input = target.querySelector<HTMLInputElement>("[data-queue-filter]")!;
  input.value = "missing";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(target.querySelector('[data-empty-reason="filtered"]')).not.toBeNull();
  const clear = Array.from(target.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Clear queue filter"
  )!;
  clear.click();
  await flush();
  expect(input.value).toBe("");
  expect(document.activeElement).toBe(input);
});
it("opens read-only queue commands from an empty queue and keeps focus in the mode selector", async () => {
  const target = render(
    Queue,
    {
      ok: true,
      query: "SELECT * FROM empty",
      record_count: 0,
      result: { columns: [], records: [] },
    },
    "empty_messages"
  );
  const view = Array.from(target.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "View queue commands"
  )!;
  view.click();
  await flush();
  expect(target.querySelector("[data-renderer-empty]")).toBeNull();
  expect(document.activeElement).toBe(
    target.querySelector('[data-queue-mode="commands"]')
  );
  expect(target.textContent).toContain("read-only");
});
