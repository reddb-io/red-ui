import { afterEach, expect, test, vi } from "vitest";
import { createConnections, makeCustomConnection } from "./connections.svelte";
import { ActivityStore } from "./activity.svelte";
import { LoadingStore } from "./loading.svelte";
import {
  EMPTY_SERVER_CAPABILITIES,
  LocalUrlProvider,
  type RedClient,
} from "./reddb/index";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const disposals: Array<() => void> = [];
afterEach(() => {
  for (const dispose of disposals.splice(0)) dispose();
  vi.unstubAllGlobals();
});

function setup() {
  const auth = deferred<Response>();
  const fetcher = vi.fn(() => auth.promise);
  vi.stubGlobal("fetch", fetcher);
  const client = {
    ping: vi.fn(async () => ({ ok: true, rtt_ms: 2 })),
    stats: vi.fn(async () => ({ collections: 0, records: 0 })),
    replication: vi.fn(async () => undefined),
    capabilities: vi.fn(async () => ({ ...EMPTY_SERVER_CAPABILITIES })),
  };
  const loading = new LoadingStore();
  const activity = new ActivityStore();
  const { connection } = createConnections({
    loading,
    activity,
    provider: new LocalUrlProvider({
      clientFactory: () => client as unknown as RedClient,
    }),
  });
  disposals.push(() => connection.dispose());
  return { auth, fetcher, client, loading, activity, connection };
}

test("a credential handoff stays visibly busy from sign-in through discovery without interaction", async () => {
  const { auth, fetcher, client, loading, activity, connection } = setup();
  const stats = deferred<{ collections: number; records: number }>();
  client.stats.mockImplementation(() => stats.promise);
  const boot = connection.bootstrap(async () => ({
    target: "reds://admin:synthetic-password@orders.acme.dbs.reddb.dev:5050",
    route: "/query",
  }));
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  expect(connection.connecting).toBe(true);
  expect(connection.connected).toBe(false);
  expect(loading.current?.label).toBe("Signing in");
  expect(activity.inflight).toBe(1);
  const started = loading.startedAt;

  auth.resolve(Response.json({ ok: true, token: "synthetic-session" }));
  await vi.waitFor(() => expect(client.stats).toHaveBeenCalledOnce());
  expect(connection.connecting).toBe(true);
  expect(loading.startedAt).toBe(started);
  expect(loading.steps.map((step) => [step.label, step.status])).toEqual([
    ["Signing in", "done"],
    ["Reaching server", "done"],
    ["Fetching stats & capabilities", "active"],
  ]);
  expect(JSON.stringify(loading.steps)).not.toContain("synthetic-password");
  expect(JSON.stringify(loading.steps)).not.toContain("synthetic-session");

  stats.resolve({ collections: 0, records: 0 });
  await expect(boot).resolves.toBe("/query");
  expect(connection.connected).toBe(true);
  expect(connection.connecting).toBe(false);
  expect(activity.inflight).toBe(0);
});

test("a rejected sign-in ends progress and exposes the error for retry", async () => {
  const { auth, loading, connection } = setup();
  const login = connection.login(
    makeCustomConnection("https://db.example"),
    "admin",
    "synthetic-password",
  );
  expect(connection.connecting).toBe(true);
  auth.resolve(
    Response.json({ error: "Invalid credentials" }, { status: 401 }),
  );
  await expect(login).resolves.toBe(false);
  expect(connection.connected).toBe(false);
  expect(connection.connecting).toBe(false);
  expect(connection.probe.error).toContain("Check your credentials");
  expect(loading.current?.status).toBe("error");
});

test("disconnecting during sign-in dismisses progress and ignores the late token", async () => {
  const { auth, client, connection } = setup();
  const login = connection.login(
    makeCustomConnection("https://db.example"),
    "admin",
    "synthetic-password",
  );
  expect(connection.connecting).toBe(true);
  connection.disconnect();
  expect(connection.connecting).toBe(false);
  auth.resolve(Response.json({ ok: true, token: "late-session" }));
  await expect(login).resolves.toBe(false);
  expect(client.ping).not.toHaveBeenCalled();
  expect(connection.connected).toBe(false);
  expect(connection.client).toBeNull();
});
