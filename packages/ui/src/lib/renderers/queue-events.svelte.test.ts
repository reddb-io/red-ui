import { afterEach, expect, it } from "vitest";
import { mount, tick, unmount } from "svelte";
import Queue from "./QueueRenderer.svelte";
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
it("renders event envelopes in the Data Kit grid and retains queue commands", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const values = {
    message_id: "203755",
    payload: {
      collection: "reviews",
      op: "insert",
      id: "rv-001",
      lsn: 203502,
      ts: 1779910021532,
      after: { rating: 5 },
    },
  };
  const result = {
    ok: true,
    query: "QUEUE PEEK jobs",
    record_count: 2,
    result: { columns: Object.keys(values), records: [{ values }, { values }] },
  };
  mounted = mount(Queue, { target, props: { result, collection: "jobs" } });
  await flush();
  expect(target.querySelector("[data-table]")).not.toBeNull();
  expect(target.querySelectorAll("[data-table-row]")).toHaveLength(2);
  const row = target.querySelector("[data-table-row]")!;
  expect(row.textContent).toContain("reviews");
  expect(row.textContent).toContain("insert");
  expect(row.textContent).toContain("rv-001");
  expect(row.textContent).toContain("203502");
  expect(row.textContent).toContain('"rating":5');
  target
    .querySelector<HTMLButtonElement>('[data-queue-mode="commands"]')!
    .click();
  await flush();
  expect(target.textContent).toContain("QUEUE PEEK jobs 25");
  expect(target.textContent).toContain("read-only");
});
