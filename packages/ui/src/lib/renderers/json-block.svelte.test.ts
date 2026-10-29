import { afterEach, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import Json from "./JsonRenderer.svelte";
import { prettyJson, projectJson } from "./json-render";
let mounted: ReturnType<typeof mount> | undefined;
afterEach(async () => {
  if (mounted) await unmount(mounted);
  mounted = undefined;
  Reflect.deleteProperty(navigator, "clipboard");
  document.body.innerHTML = "";
});
it("shows and copies the exact raw JSON using Design System tokens", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const result = {
    ok: true,
    query: "SELECT * FROM notes",
    record_count: 1,
    result: {
      columns: ["body"],
      records: [{ values: { body: "<script>unsafe</script>", value: 42 } }],
    },
  };
  const target = document.createElement("div");
  document.body.append(target);
  mounted = mount(Json, { target, props: { result, collection: "notes" } });
  await tick();
  expect(target.querySelector("code")?.textContent).toBe(
    prettyJson(projectJson(result))
  );
  expect(target.querySelector("script")).toBeNull();
  expect(target.querySelector('[data-code-token="number"]')?.textContent).toBe(
    "1"
  );
  target.querySelector<HTMLButtonElement>("[data-code-block-copy]")!.click();
  await vi.waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(prettyJson(projectJson(result)))
  );
});
