import { afterEach, describe, expect, it, vi } from "vitest";
import { RedClient, type ConnectionProvider, type QueryResult } from "./reddb/index";
import {
  createWorkspaceRuntime,
  type WorkspaceRuntime,
} from "./workspace-runtime.svelte";
import { MemoryStorage } from "./workspace-storage";
import type { WorkspaceSnapshot } from "./workspace-session";

const runtimes: WorkspaceRuntime[] = [];
function runtime(options: Parameters<typeof createWorkspaceRuntime>[0] = {}) {
  const next = createWorkspaceRuntime(options);
  runtimes.push(next);
  return next;
}
afterEach(() => {
  for (const instance of runtimes.splice(0)) instance.dispose();
  vi.useRealTimers();
});

function provider(label: string, fetcher?: typeof fetch) {
  const client = new RedClient(`https://${label}.example`, {
    headers: { "X-Workspace": label },
    fetch:
      fetcher ??
      (async (_input, init) => {
        const query = init?.body
          ? JSON.parse(String(init.body)).query
          : undefined;
        return Response.json(query ? result(query, label) : {});
      }),
  });
  const connection = { id: label, label, url: client.baseUrl };
  const supplied: ConnectionProvider = {
    list: async () => [connection],
    connect: async () => ({ client, connection, rtt_ms: 1 }),
    whoami: async () => ({
      authenticated: true,
      username: label,
      role: "admin",
    }),
  };
  return { supplied, client };
}
function result(query: string, owner: string): QueryResult {
  return {
    ok: true,
    query,
    record_count: 1,
    result: { columns: ["owner"], records: [{ values: { owner } }] },
  };
}
function snapshot(view: WorkspaceSnapshot["view"]): WorkspaceSnapshot {
  return { view, collection: null, subpage: null, tabs: [], activeTabId: null };
}

describe("isolated workspace runtime", () => {
  it("keeps colliding document ids, edits, commands and registrations independent", () => {
    const first = runtime();
    const second = runtime();
    const tab = {
      id: "same-id",
      kind: "query" as const,
      key: "Query 1",
      label: "Query 1",
    };
    first.tabs.hydrate([tab], tab.id);
    second.tabs.hydrate([{ ...tab }], tab.id);
    first.queryTabs.setSql(tab.id, "SELECT first");
    second.queryTabs.setSql(tab.id, "SELECT second");
    first.pendingChanges.stage("records", 1, "name", "old", "first");
    second.pendingChanges.stage("records", 1, "name", "old", "second");
    first.on("red:new-query", () => first.tabs.rename(tab.id, "Changed"));
    second.on("red:new-query", () => second.tabs.rename(tab.id, "Other"));
    first.dispatch("red:new-query");
    first.registry.unregister("table");
    expect(second.registry.has("table")).toBe(true);
    expect(first.tabs.active?.label).toBe("Changed");
    expect(second.tabs.active?.label).toBe("Query 1");
    expect(first.queryTabs.get(tab.id)?.sql).toBe("SELECT first");
    expect(second.queryTabs.get(tab.id)?.sql).toBe("SELECT second");
    expect(first.pendingChanges.changes[0].newValue).toBe("first");
    expect(second.pendingChanges.changes[0].newValue).toBe("second");
    first.dispose();
    second.dispatch("red:new-query");
    expect(second.tabs.active?.label).toBe("Other");
    expect(second.queryTabs.get(tab.id)?.sql).toBe("SELECT second");
    expect(second.pendingChanges.count).toBe(1);
    expect(second.session.signal.aborted).toBe(false);
  });

  it("scopes persistence, vault wipes and delayed saves, including the legacy profile", () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const first = runtime({ persistenceKey: "default", storage });
    const second = runtime({ persistenceKey: "other", storage });
    first.workspaceSession.flush(snapshot("query"));
    second.workspaceSession.flush(snapshot("settings"));
    first.theme.set("dark");
    second.theme.set("light");
    first.skins.select("Nocturne");
    second.skins.select("Reddb");
    expect(
      runtime({ persistenceKey: "default", storage }).workspaceSession.restore()
        ?.view
    ).toBe("query");
    expect(
      runtime({ persistenceKey: "other", storage }).workspaceSession.restore()
        ?.view
    ).toBe("settings");
    first.secureStore.wipe();
    expect(storage.getItem("red-ui-theme")).toBeNull();
    expect(storage.getItem("red-ui-skin")).toBeNull();
    expect(storage.getItem("red-ui:workspace:other:theme")).toBe("light");
    expect(storage.getItem("red-ui:workspace:other:skin")).toBeTruthy();
    expect(second.workspaceSession.restore()?.view).toBe("settings");
    first.workspaceSession.schedule(snapshot("ask"));
    second.workspaceSession.schedule(snapshot("cluster"));
    first.dispose();
    vi.runAllTimers();
    expect(first.workspaceSession.restore()).toBeNull();
    expect(second.workspaceSession.restore()?.view).toBe("cluster");
  });

  it("aborts only owned HTTP work and preserves the supplied host client", async () => {
    let complete!: (response: Response) => void;
    let signal: AbortSignal | null | undefined;
    const host = provider("first", async (_input, init) => {
      const query = init?.body
        ? JSON.parse(String(init.body)).query
        : undefined;
      expect(new Headers(init?.headers).get("X-Workspace")).toBe("first");
      if (query === "SELECT slow") {
        signal = init?.signal;
        return new Promise((resolve) => {
          complete = resolve;
        });
      }
      return Response.json(query ? result(query, "first") : {});
    });
    const other = provider("second");
    const first = runtime({ connectionProvider: host.supplied });
    const second = runtime({ connectionProvider: other.supplied });
    await Promise.all([
      first.connection.adoptInjected(),
      second.connection.adoptInjected(),
    ]);
    first.queryTabs.setExecutor((sql, options) =>
      first.connection.client!.query(sql, options)
    );
    second.queryTabs.setExecutor((sql, options) =>
      second.connection.client!.query(sql, options)
    );
    first.queryTabs.setSql("query", "SELECT slow");
    second.queryTabs.setSql("query", "SELECT second");
    const pending = first.queryTabs.run("query");
    expect(signal?.aborted).toBe(false);
    first.dispose();
    expect(signal?.aborted).toBe(true);
    await second.queryTabs.run("query");
    complete(Response.json(result("SELECT slow", "first")));
    await pending;
    expect(first.queryTabs.has("query")).toBe(false);
    expect(first.devConsole.size).toBe(0);
    expect(
      second.queryTabs.get("query")?.result?.result.records[0].values.owner
    ).toBe("second");
    expect(
      second.devConsole
        .snapshot()
        .some((entry) => entry.payload?.includes("SELECT second"))
    ).toBe(true);
    expect(
      second.devConsole
        .snapshot()
        .some((entry) => entry.payload?.includes("SELECT slow"))
    ).toBe(false);
    expect((await host.client.query("SELECT host")).ok).toBe(true);
  });

  it("does not adopt a provider that completes after disposal", async () => {
    const host = provider("first");
    let release!: () => void;
    const waiting: ConnectionProvider = {
      ...host.supplied,
      list: () =>
        new Promise((resolve) => {
          release = () => host.supplied.list().then(resolve);
        }),
    };
    const first = runtime({ connectionProvider: waiting });
    const second = runtime({ connectionProvider: provider("second").supplied });
    const pending = first.connection.adoptInjected();
    first.dispose();
    release();
    expect(await pending).toBe(false);
    await second.connection.adoptInjected();
    expect(first.connection.client).toBeNull();
    expect(second.connection.active.label).toBe("second");
    expect(second.connection.connected).toBe(true);
  });
});
