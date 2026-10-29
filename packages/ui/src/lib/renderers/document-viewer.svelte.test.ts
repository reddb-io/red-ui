import { afterEach, expect, it } from "vitest";
import { mount, tick, unmount } from "svelte";
import Document from "./DocumentRenderer.svelte";

let mounted: ReturnType<typeof mount> | undefined;
afterEach(async () => {
  if (mounted) await unmount(mounted);
  mounted = undefined;
  document.body.innerHTML = "";
});
async function flush() {
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
}
it("preserves RedDB body, user fields, raw record and document search", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const values = {
    rid: 1026,
    kind: "document",
    collection: "notes",
    title: "Runbook",
    body: { topic: "Index repair" },
    status: "ready",
  };
  mounted = mount(Document, {
    target,
    props: {
      collection: "notes",
      result: {
        ok: true,
        query: "SELECT * FROM notes",
        record_count: 1,
        result: { columns: Object.keys(values), records: [{ values }] },
      },
    },
  });
  await flush();
  expect(target.querySelector("[data-document-body]")?.textContent).toContain(
    '"topic": "Index repair"'
  );
  const tab = (label: string) =>
    [...target.querySelectorAll<HTMLButtonElement>("[role=tab]")].find(
      (button) => button.textContent?.trim() === label
    )!;
  tab("Fields").click();
  await flush();
  expect(target.querySelector("[data-document-field]")?.textContent).toContain(
    "title"
  );
  expect(target.querySelectorAll("[data-document-field]").length).toBe(2);
  tab("Raw").click();
  await flush();
  expect(target.querySelector("[data-document-raw]")?.textContent).toContain(
    '"rid": 1026'
  );
  const filter = target.querySelector<HTMLInputElement>(
    '[aria-label="Filter documents"]'
  )!;
  filter.value = "Index repair";
  filter.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(target.querySelectorAll("[role=option]").length).toBe(1);
  filter.value = "not present";
  filter.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(target.querySelector('[data-empty-reason="filtered"]')).not.toBeNull();
  const clear = [...target.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Clear document filter"
  )!;
  clear.click();
  await flush();
  expect(document.activeElement).toBe(filter);
  expect(filter.value).toBe("");
});
