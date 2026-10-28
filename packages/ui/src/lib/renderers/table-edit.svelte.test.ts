import { afterEach, expect, it } from "vitest";
import { mount, tick, unmount } from "svelte";
import Table from "./TableRenderer.svelte";
import { pendingChanges } from "../pending-changes.svelte";

let mounted: ReturnType<typeof mount> | undefined;
afterEach(async () => {
  if (mounted) await unmount(mounted);
  mounted = undefined;
  pendingChanges.clear();
  document.body.innerHTML = "";
});
async function flush() {
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
}
async function setup(records: Array<Record<string, unknown>>) {
  const target = document.createElement("div");
  document.body.append(target);
  const result = {
    ok: true,
    query: "SELECT * FROM users",
    record_count: records.length,
    result: {
      columns: ["rid", "name"],
      records: records.map((values) => ({ values })),
    },
  };
  mounted = mount(Table, { target, props: { result, collection: "users" } });
  await flush();
  return target;
}
it("stages the physical row id after filtering, rather than the visual row index", async () => {
  const target = await setup([
    { rid: 101, name: "Ada" },
    { rid: 1027, name: "Grace" },
  ]);
  target
    .querySelector<HTMLButtonElement>("[data-table-filter-toggle]")!
    .click();
  await flush();
  const filter = target.querySelector<HTMLInputElement>("thead input")!;
  filter.value = "Grace";
  filter.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  const cell = target.querySelector<HTMLElement>("tbody tr td:nth-child(2)")!;
  cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  await flush();
  const editor = cell.querySelector<HTMLInputElement>("input")!;
  expect(editor).not.toBeNull();
  editor.value = "Grace B";
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  editor.dispatchEvent(new FocusEvent("blur"));
  await flush();
  expect(pendingChanges.changes).toMatchObject([
    {
      table: "users",
      row: 1027,
      col: "name",
      oldValue: "Grace",
      newValue: "Grace B",
    },
  ]);
});
it("does not allow editing when the result lacks a physical row id", async () => {
  const target = await setup([{ name: "Ada" }]);
  const cell = target.querySelector<HTMLElement>("tbody tr td:nth-child(2)")!;
  cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  await flush();
  expect(cell.querySelector("input")).toBeNull();
  expect(pendingChanges.changes).toEqual([]);
});
