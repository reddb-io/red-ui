import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceRuntime,
  type WorkspaceRuntime,
} from "./workspace-runtime.svelte";
import { MemoryStorage } from "./workspace-storage";
import { ConnectionSessionStore } from "./connection-session";
const instances: WorkspaceRuntime[] = [];
const durable = new MemoryStorage(),
  transient = new MemoryStorage();
function create(key = "default") {
  const instance = createWorkspaceRuntime({
    persistenceKey: key,
    storage: durable,
    resumeStorage: transient,
    surface: "web",
  });
  instances.push(instance);
  return instance;
}
afterEach(() => {
  instances.splice(0).forEach((instance) => instance.dispose());
  for (const storage of [durable, transient])
    while (storage.length) storage.removeItem(storage.key(0)!);
  vi.unstubAllGlobals();
});
function api() {
  const calls: { path: string; auth: string | null }[] = [];
  let reject = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input, init) => {
      const path = new URL(String(input)).pathname;
      calls.push({
        path,
        auth: new Headers(init?.headers).get("Authorization"),
      });
      if (reject) return new Response("expired", { status: 401 });
      return Response.json(
        path === "/auth/login" ? { ok: true, token: "tab-token" } : { ok: true }
      );
    })
  );
  return {
    calls,
    expire: () => {
      reject = true;
    },
  };
}
describe("connection reload recovery", () => {
  it("resumes sign-in with the token in the same tab, without persisting its password", async () => {
    const { calls } = api();
    const first = create();
    expect(
      await first.connection.connectString(
        "https://alice:password-secret@bank.example"
      )
    ).toBe(true);
    const raw = transient.getItem("red-ui:connection-session")!;
    expect(raw).toContain("tab-token");
    expect(raw).not.toContain("alice");
    expect(raw).not.toContain("password-secret");
    expect(durable.getItem("red-ui:connection-session")).toBeNull();
    expect(durable.getItem("red-ui:connection")).toBeNull();
    first.dispose(); // Unmount/reload must not behave as explicit disconnect.
    const second = create();
    await second.connection.bootstrap();
    expect(second.connection.connected).toBe(true);
    expect(calls.filter((call) => call.path === "/auth/login")).toHaveLength(1);
    expect(calls.at(-1)?.auth).toBe("Bearer tab-token");
    second.connection.disconnect();
    expect(transient.getItem("red-ui:connection-session")).toBeNull();
  });
  it("recovers an anonymous target but never probes a target from a different profile", async () => {
    const { calls } = api();
    const first = create();
    await first.connection.connectString("http://127.0.0.1:14730");
    first.dispose();
    const count = calls.length;
    const other = create("other");
    await other.connection.bootstrap();
    expect(other.connection.connected).toBe(false);
    expect(calls).toHaveLength(count);
    const same = create();
    await same.connection.bootstrap();
    expect(same.connection.connected).toBe(true);
  });
  it("prefers an explicit new target over the saved token and does not leak auth between servers", async () => {
    const { calls } = api();
    const first = create();
    await first.connection.connectString("https://alice:secret@bank.example");
    first.dispose();
    const second = create();
    await second.connection.bootstrap(async () => ({
      target: "https://other.example",
    }));
    expect(second.connection.active.url).toBe("https://other.example");
    expect(calls.at(-1)?.auth).toBeNull();
    expect(transient.getItem("red-ui:connection-session")).not.toContain(
      "tab-token"
    );
  });
  it("discards an expired session and leaves sign-in available", async () => {
    const fixture = api();
    const first = create();
    await first.connection.connectString("https://alice:secret@bank.example");
    first.dispose();
    fixture.expire();
    const second = create();
    await second.connection.bootstrap();
    expect(second.connection.connected).toBe(false);
    expect(second.connection.probe.error).toContain("401");
    expect(transient.getItem("red-ui:connection-session")).toBeNull();
  });
  it("ignores malformed storage and refuses stored passwords", () => {
    const store = new ConnectionSessionStore(transient, "session");
    for (const raw of [
      "{oops",
      "{}",
      '{"target":"https://alice:secret@bank.example"}',
      '{"target":"https://bank.example?token=secret"}',
    ]) {
      transient.setItem("session", raw);
      expect(store.read()).toBeNull();
    }
  });
});

it("wipes reload recovery only for the selected workspace", async () => {
  api();
  const first = create(),
    other = create("other");
  await first.connection.connectString("https://alice:secret@bank.example");
  await other.connection.connectString(
    "https://bob:other-secret@other.example"
  );
  first.secureStore.wipe();
  expect(transient.getItem("red-ui:connection-session")).toBeNull();
  expect(
    transient.getItem("red-ui:workspace:other:connection-session")
  ).toContain("tab-token");
});

it("resumes the same sanitized URL without sending its token to another browser tab", async () => {
  const { calls } = api();
  const first = create();
  await first.connection.connectString("https://alice:secret@bank.example");
  first.dispose();
  const next = create();
  await next.connection.bootstrap(async () => ({
    target: "https://bank.example",
  }));
  expect(calls.at(-1)?.auth).toBe("Bearer tab-token");
  const before = calls.length;
  const freshTab = createWorkspaceRuntime({
    persistenceKey: "default",
    storage: durable,
    resumeStorage: new MemoryStorage(),
    surface: "web",
  });
  instances.push(freshTab);
  await freshTab.connection.bootstrap();
  expect(calls).toHaveLength(before);
  expect(freshTab.connection.connected).toBe(false);
});

it("retains a known login through offline startup and resumes it when the network returns", async () => {
  api();
  const first = create();
  await first.connection.connectString("https://alice:secret@bank.example");
  first.dispose();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    })
  );
  const offline = create();
  await offline.connection.bootstrap();
  expect(offline.connection.connected).toBe(false);
  expect(transient.getItem("red-ui:connection-session")).toContain("tab-token");
  offline.dispose();
  const { calls } = api();
  const online = create();
  await online.connection.bootstrap();
  expect(online.connection.connected).toBe(true);
  expect(calls.at(-1)?.auth).toBe("Bearer tab-token");
  expect(calls.some((call) => call.path === "/auth/login")).toBe(false);
});
