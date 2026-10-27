import { afterEach, expect, test, vi } from "vitest";
import { flushSync, mount, tick, unmount } from "svelte";
import Workspace from "./Workspace.svelte";
import {
  createWorkspaceRuntime,
  type WorkspaceRuntime,
} from "./workspace-runtime.svelte";
import { RedClient, type ConnectionProvider } from "#reddb";

const roots: ReturnType<typeof mount>[] = [];
const runtimes: WorkspaceRuntime[] = [];
const calls: { owner: string; query: string }[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await unmount(root);
  for (const runtime of runtimes.splice(0)) runtime.dispose();
  document.body.innerHTML = "";
  calls.length = 0;
  vi.useRealTimers();
});

function create(owner: string) {
  const connection = {
    id: owner,
    label: owner,
    url: `https://${owner}.example`,
  };
  const client = new RedClient(connection.url, {
    fetch: async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path === "/stats")
        return Response.json({
          active_connections: 1,
          idle_connections: 0,
          started_at_unix_ms: 0,
          store: {
            collection_count: 0,
            cross_ref_count: 0,
            total_entities: 0,
            total_memory_bytes: 0,
          },
          system: {
            arch: "test",
            cpu_cores: 1,
            hostname: owner,
            os: "test",
            pid: 1,
            total_memory_bytes: 0,
            available_memory_bytes: 0,
          },
        });
      if (path === "/collections") return Response.json({ collections: [] });
      if (path === "/replication") return Response.json({ role: "primary" });
      if (path === "/query") {
        const query = JSON.parse(String(init?.body)).query;
        calls.push({ owner, query });
        return Response.json({
          ok: true,
          query,
          record_count: 1,
          result: { columns: ["owner"], records: [{ values: { owner } }] },
        });
      }
      return new Response("not found", { status: 404 });
    },
  });
  const connectionProvider: ConnectionProvider = {
    list: async () => [connection],
    connect: async () => ({ connection, client, rtt_ms: 1 }),
    whoami: async () => ({
      authenticated: true,
      username: owner,
      role: "admin",
    }),
  };
  const runtime = createWorkspaceRuntime({ connectionProvider });
  runtimes.push(runtime);
  const target = document.createElement("div");
  document.body.append(target);
  const root = mount(Workspace, {
    target,
    props: { runtime, initialRoute: "/query" },
  });
  roots.push(root);
  return { runtime, target, root };
}

test("two mounted workspaces route execution, dialogs and disposal to their own session", async () => {
  vi.useFakeTimers();
  const pageAppearance = document.documentElement.outerHTML.split(">")[0];
  const pendingAppearance = createWorkspaceRuntime();
  pendingAppearance.theme.set("dark");
  pendingAppearance.skins.select("Nocturne");
  pendingAppearance.dispose();
  expect(document.documentElement.outerHTML.split(">")[0]).toBe(pageAppearance);
  const first = create("first");
  const second = create("second");
  flushSync();
  await vi.advanceTimersByTimeAsync(1050);
  await tick();
  flushSync();
  const firstId = first.runtime.tabs.activeId!;
  const secondId = second.runtime.tabs.activeId!;
  const secondScheme = second.runtime.theme.current;
  first.runtime.theme.toggle();
  expect(second.runtime.theme.current).toBe(secondScheme);
  expect(document.documentElement.outerHTML.split(">")[0]).toBe(pageAppearance);
  expect(firstId).toBeTruthy();
  expect(secondId).toBeTruthy();
  first.runtime.queryTabs.setSql(firstId, "SELECT 'first'");
  second.runtime.queryTabs.setSql(secondId, "SELECT 'second'");
  await Promise.all([
    first.runtime.queryTabs.run(firstId),
    second.runtime.queryTabs.run(secondId),
  ]);
  flushSync();
  expect(calls).toContainEqual({ owner: "first", query: "SELECT 'first'" });
  expect(calls).toContainEqual({ owner: "second", query: "SELECT 'second'" });
  expect(
    (first.target.querySelector("textarea") as HTMLTextAreaElement).value
  ).toBe("SELECT 'first'");
  expect(
    (second.target.querySelector("textarea") as HTMLTextAreaElement).value
  ).toBe("SELECT 'second'");
  first.runtime.pendingChanges.stage("records", 1, "name", "old", "first edit");
  await first.runtime.pendingChanges.commitAll();
  expect(calls.filter((call) => call.query.startsWith("UPDATE"))).toEqual([
    {
      owner: "first",
      query: "UPDATE records SET name = 'first edit' WHERE rid = 1;",
    },
  ]);
  first.runtime.dispatch("red:open-palette");
  await tick();
  flushSync();
  expect(first.target.querySelector("dialog[open]")).not.toBeNull();
  expect(second.target.querySelector("dialog[open]")).toBeNull();
  const ids = [...document.querySelectorAll("[id]")].map(
    (element) => element.id
  );
  expect(new Set(ids).size).toBe(ids.length);
  await unmount(first.root);
  roots.splice(roots.indexOf(first.root), 1);
  expect(first.runtime.session.disposed).toBe(true);
  expect(second.runtime.session.disposed).toBe(false);
  second.runtime.queryTabs.setSql(secondId, "SELECT 'still second'");
  await second.runtime.queryTabs.run(secondId);
  expect(calls.at(-1)).toEqual({
    owner: "second",
    query: "SELECT 'still second'",
  });
  expect(
    second.runtime.queryTabs.get(secondId)?.result?.result.records[0].values
      .owner
  ).toBe("second");
  await unmount(second.root);
  roots.splice(roots.indexOf(second.root), 1);
  expect(vi.getTimerCount()).toBe(0);
});
