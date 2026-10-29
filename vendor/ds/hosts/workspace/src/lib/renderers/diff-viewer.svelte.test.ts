import { afterEach, expect, it } from "vitest";
import { mount, tick, unmount } from "svelte";
import DiffRenderer from "./DiffRenderer.svelte";
import { hasDiffShape } from "./diff-render";

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
it("maps RedDB changes to the Data Kit and preserves search and raw records", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const records = [
    {
      values: {
        id: "d1",
        change: "modified",
        entity_id: "one",
        target_collection: "items",
        before_state: '{"risk":2}',
        after_state: '{"risk":1}',
      },
    },
    {
      values: {
        id: "d2",
        change: "added",
        entity_id: "two",
        after_state: '{"risk":3}',
      },
    },
  ];
  const result = {
    ok: true,
    query: "",
    record_count: records.length,
    result: { columns: ["change"], records },
  };
  expect(hasDiffShape(result)).toBe(true);
  mounted = mount(DiffRenderer, {
    target,
    props: { result, collection: "items" },
  });
  await flush();
  expect(target.querySelector("[data-diff-explorer]")?.textContent).toContain(
    "risk"
  );
  const filter = target.querySelector<HTMLInputElement>("input[type=search]")!;
  filter.value = "two";
  filter.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(
    target.querySelector('[aria-label="Change details"]')?.textContent
  ).toContain("two");
  const raw = [...target.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Raw"
  )!;
  raw.click();
  await flush();
  expect(target.textContent).toContain('"d2"');
  expect(target.textContent).not.toContain('"d1"');
});
