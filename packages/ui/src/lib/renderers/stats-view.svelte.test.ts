import { afterEach, expect, it } from "vitest";
import { mount, tick, unmount } from "svelte";
import Stats from "./StatsRenderer.svelte";

let mounted: ReturnType<typeof mount> | undefined;
afterEach(async () => {
  if (mounted) await unmount(mounted);
  mounted = undefined;
  document.body.innerHTML = "";
});

it("keeps formatted metrics and every row across the KPI, gauge and table views", async () => {
  const target = document.createElement("div");
  document.body.append(target);
  const records = Array.from({ length: 30 }, (_, i) => ({
    values: {
      metric: `metric_${i}`,
      value: i === 0 ? 2048 : i,
      unit: i === 0 ? "bytes" : "count",
    },
  }));
  const result = {
    ok: true,
    query: "SELECT metrics",
    record_count: records.length,
    result: { columns: ["metric", "value", "unit"], records },
  };
  mounted = mount(Stats, { target, props: { result, collection: "metrics" } });
  await tick();
  expect(target.querySelectorAll("[data-kpi-card]")).toHaveLength(30);
  expect(target.textContent).toContain("2.0 KiB");
  const buttons = [...target.querySelectorAll("button")];
  buttons.find((button) => button.textContent?.trim() === "gauges")!.click();
  await tick();
  expect(target.querySelectorAll('svg[aria-label$="gauge"]')).toHaveLength(30);
  buttons.find((button) => button.textContent?.trim() === "table")!.click();
  await tick();
  expect(target.querySelectorAll("[data-table-row]")).toHaveLength(30);
  expect(target.querySelector("[data-table]")?.textContent).toContain(
    "metric_29"
  );
  expect(target.querySelector("[data-table]")?.textContent).toContain("2,048");
  expect(target.querySelector("[data-table]")?.textContent).toContain("bytes");
});
