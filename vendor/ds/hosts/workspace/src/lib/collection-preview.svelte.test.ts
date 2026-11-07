import { afterEach, expect, test, vi } from "vitest";
import { flushSync, mount, tick, unmount } from "svelte";
import Workspace from "./Workspace.svelte";
import {
  createWorkspaceRuntime,
  type WorkspaceRuntime,
} from "./workspace-runtime.svelte";
import { createStateRouter } from "./router.svelte";
import { MemoryStorage } from "./workspace-storage";
import { RedClient, type ConnectionProvider } from "./reddb/index";

const roots: ReturnType<typeof mount>[] = [];
const runtimes: WorkspaceRuntime[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await unmount(root);
  for (const runtime of runtimes.splice(0)) runtime.dispose();
  document.body.innerHTML = "";
});

test.each(["config", "vault"])(
  "waits for the %s model before its first preview and retains it when presentation resolves",
  async (model) => {
    let release!: () => void;
    const catalogReady = new Promise<void>((resolve) => (release = resolve));
    const collection = `red.${model}`;
    const queries: string[] = [];
    const endpoint = { id: "test", label: "test", url: "https://preview.test" };
    const client = new RedClient(endpoint.url, {
      fetch: async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/query") {
          const query = JSON.parse(String(init?.body)).query as string;
          queries.push(query);
          if (query.startsWith("SELECT model FROM red.collections"))
            await catalogReady;
          if (query.startsWith("SELECT * FROM red."))
            return Response.json(
              { ok: false, error: "wrong provisional table read" },
              { status: 400 },
            );
          const values = query.includes("FROM red.collections")
            ? { name: collection, model }
            : { key: "mode", value: "masked" };
          return Response.json({
            ok: true,
            query,
            record_count: 1,
            result: { columns: Object.keys(values), records: [{ values }] },
          });
        }
        if (path === "/collections") return Response.json({ collections: [] });
        if (path === "/replication") return Response.json({ role: "primary" });
        return Response.json({});
      },
    });
    const provider: ConnectionProvider = {
      list: async () => [endpoint],
      connect: async () => ({ connection: endpoint, client, rtt_ms: 1 }),
      whoami: async () => ({
        authenticated: true,
        username: "tester",
        role: "admin",
      }),
    };
    const runtime = createWorkspaceRuntime({
      connectionProvider: provider,
      storage: new MemoryStorage(),
      resumeStorage: new MemoryStorage(),
    });
    runtimes.push(runtime);
    const router = createStateRouter({
      view: "collections",
      collection,
      subpage: null,
    });
    const target = document.createElement("div");
    document.body.append(target);
    roots.push(
      mount(Workspace, {
        target,
        props: { runtime, router, initialRoute: `/c/${collection}` },
      }),
    );
    flushSync();
    await vi.waitFor(() =>
      expect(
        queries.some((query) =>
          query.startsWith("SELECT model FROM red.collections"),
        ),
      ).toBe(true),
    );
    expect(
      queries.some((query) => query.startsWith("SELECT * FROM red.")),
    ).toBe(false);
    expect(queries.some((query) => query.startsWith("LIST "))).toBe(false);
    release();
    const native = `LIST ${model.toUpperCase()} ${collection} LIMIT 200`;
    await vi.waitFor(() => expect(queries).toContain(native));
    await vi.waitFor(() => expect(runtime.tabs.active?.capability).toBe("kv"));
    await tick();
    flushSync();
    await tick();
    expect(queries.filter((query) => query === native)).toHaveLength(1);
    expect(
      queries.some((query) => query.startsWith("SELECT * FROM red.")),
    ).toBe(false);
    expect(queries.some((query) => query.startsWith("LIST KV"))).toBe(false);
    expect(target.textContent).not.toContain("Query failed");
  },
);
