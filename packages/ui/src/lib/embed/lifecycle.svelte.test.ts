import { expect, test, vi } from "vitest";
import { flushSync, tick } from "svelte";
import { mountRedUi, RedClient, InjectedClientProvider } from "./index";

// This suite exercises SDK ownership; rendered CSS is checked in real browsers.
vi.mock("../../app.css?inline", () => ({ default: "" }));

test("concurrent mounts and stale handles preserve a replacement, including closed shadow roots", async () => {
  vi.useFakeTimers();
  const host = document.createElement("div");
  document.body.append(host);
  const client = new RedClient("https://host.example", {
    fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      if (path === "/collections") return Response.json({ collections: [] });
      if (path === "/query")
        return Response.json({
          ok: true,
          record_count: 0,
          result: { columns: [], records: [] },
        });
      return new Response("not found", { status: 404 });
    },
  });
  const options = {
    connectionProvider: new InjectedClientProvider({
      client,
      connection: { id: "host", label: "Host", url: client.baseUrl },
    }),
    initialRoute: "/collections",
    shadowRoot: { mode: "closed" as const },
  };
  const handles: Awaited<ReturnType<typeof mountRedUi>>[] = [];
  try {
    const [first, second] = await Promise.all([
      mountRedUi(host, options),
      mountRedUi(host, options),
    ]);
    handles.push(first, second);
    expect(first.runtime.session.disposed).toBe(true);
    expect(second.runtime.session.disposed).toBe(false);
    expect(host.shadowRoot).toBeNull();
    expect(second.shadowRoot).toBe(first.shadowRoot);
    flushSync();
    await vi.advanceTimersByTimeAsync(1050);
    expect(second.runtime.connection.active.label).toBe("Host");

    const replacement = await mountRedUi(host, options);
    handles.push(replacement);
    first.destroy();
    second.destroy();
    second.destroy();
    flushSync();
    await vi.advanceTimersByTimeAsync(1050);
    expect(second.runtime.session.disposed).toBe(true);
    expect(replacement.runtime.session.disposed).toBe(false);
    expect(
      replacement.shadowRoot
        .querySelector("[data-workspace-root]")
        ?.getAttribute("data-workspace-root")
    ).toBe(replacement.runtime.id);
    const before = replacement.runtime.tabs.tabs.length;
    const menu = replacement.shadowRoot.querySelector<HTMLElement>(
      '[aria-label="Open tab menu"]'
    )!;
    menu.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        bubbles: true,
        composed: true,
      })
    );
    flushSync();
    expect(replacement.runtime.tabs.tabs.length).toBe(before + 1);
    const editor = replacement.shadowRoot.querySelector("textarea")!;
    editor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        bubbles: true,
        composed: true,
      })
    );
    flushSync();
    expect(replacement.runtime.tabs.tabs.length).toBe(before + 1);
    replacement.destroy();
    expect((await client.query("SELECT host_owned_client")).ok).toBe(true);
  } finally {
    for (const handle of handles) handle.destroy();
    await tick();
    await vi.advanceTimersByTimeAsync(0);
    host.remove();
    vi.useRealTimers();
  }
}, 20_000);
