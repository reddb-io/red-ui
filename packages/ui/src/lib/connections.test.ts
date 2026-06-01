import { afterEach, describe, expect, it, vi } from "vitest";
import {
  connection,
  getConnectionProvider,
  provider,
  setConnectionProvider,
} from "./connections.svelte";
import {
  DESKTOP_TRANSPORTS,
  EMPTY_SERVER_CAPABILITIES,
  InjectedClientProvider,
  LocalUrlProvider,
  readInjectedGlobalBootstrap,
  readUrlOpenContractBootstrap,
  resolveConnectionBootstrap,
} from "#reddb";
import type { RedClient, RedClientOptions, ServerCapabilities } from "#reddb";

interface FakeOpts {
  /** Extra fields merged into the /stats response (e.g. read_only for #23). */
  stats?: Record<string, unknown>;
  /** Capability map the client reports (#22). Defaults to all-unsupported. */
  capabilities?: Partial<ServerCapabilities>;
}

// Fake client covering every method tryConnect touches (ping/stats/replication/
// capabilities on connect, whoami on demand). The host would inject a real one.
function fakeClient({ stats = {}, capabilities }: FakeOpts = {}): RedClient {
  return {
    ping: vi.fn(async () => ({ ok: true, rtt_ms: 3 })),
    stats: vi.fn(async () => ({ collections: 0, records: 0, ...stats })),
    replication: vi.fn(async () => undefined),
    capabilities: vi.fn(
      async (): Promise<ServerCapabilities> => ({
        ...EMPTY_SERVER_CAPABILITIES,
        ...capabilities,
      })
    ),
    whoami: vi.fn(async () => ({
      authenticated: true,
      username: "host",
      role: "admin",
    })),
  } as unknown as RedClient;
}

afterEach(() => {
  // Restore the default seam so tests don't leak the injected provider.
  setConnectionProvider(provider);
  connection.disconnect();
});

describe("connection seam (ADR-0001)", () => {
  it("defaults to the LocalUrlProvider so the PWA/Desktop Connect flow is unchanged", () => {
    expect(getConnectionProvider()).toBe(provider);
    expect(provider).toBeInstanceOf(LocalUrlProvider);
  });

  it("adopting a host-injected provider connects without the Connect flow", async () => {
    const client = fakeClient();
    setConnectionProvider(new InjectedClientProvider({ client }));

    expect(connection.connected).toBe(false); // Connect flow would still gate here
    const ok = await connection.adoptInjected();

    expect(ok).toBe(true);
    expect(connection.connected).toBe(true);
    // The Core's client is the exact instance the host injected — never built here.
    expect(connection.client).toBe(client);
    expect(connection.probe.reachable).toBe(true);
  });

  it("the Core only ever exposes the provider-supplied client", async () => {
    const client = fakeClient();
    setConnectionProvider(new InjectedClientProvider({ client }));
    await connection.adoptInjected();
    expect(connection.client).toBe(client);

    connection.disconnect();
    expect(connection.client).toBeNull(); // no URL-built fallback
  });
});

describe("read-only state (#23)", () => {
  it("is false when the server reports no read-only signal", async () => {
    setConnectionProvider(new InjectedClientProvider({ client: fakeClient() }));
    await connection.adoptInjected();
    expect(connection.connected).toBe(true);
    expect(connection.readOnly).toBe(false);
  });

  it("is true, with the reason, when the server reports read_only", async () => {
    setConnectionProvider(
      new InjectedClientProvider({
        client: fakeClient({
          stats: {
            read_only: true,
            read_only_reason: "file in use by another writer",
          },
        }),
      })
    );
    await connection.adoptInjected();
    expect(connection.readOnly).toBe(true);
    expect(connection.readOnlyReason).toBe("file in use by another writer");
  });

  it("is false once disconnected even if the last probe was read-only", async () => {
    setConnectionProvider(
      new InjectedClientProvider({
        client: fakeClient({ stats: { read_only: true } }),
      })
    );
    await connection.adoptInjected();
    expect(connection.readOnly).toBe(true);
    connection.disconnect();
    expect(connection.readOnly).toBe(false); // gated on `connected`, never hardcoded
  });
});

describe("capability negotiation (#22)", () => {
  it("exposes the capabilities the server reports at connect", async () => {
    setConnectionProvider(
      new InjectedClientProvider({
        client: fakeClient({ capabilities: { vcs: true } }),
      })
    );
    await connection.adoptInjected();
    expect(connection.capabilities.vcs).toBe(true);
    expect(connection.capabilities.clusterStatus).toBe(false); // not reported ⇒ stays hidden
  });

  it("defaults to all-unsupported before connect and resets on disconnect", async () => {
    expect(connection.capabilities).toEqual(EMPTY_SERVER_CAPABILITIES);
    setConnectionProvider(
      new InjectedClientProvider({
        client: fakeClient({ capabilities: { vcs: true } }),
      })
    );
    await connection.adoptInjected();
    expect(connection.capabilities.vcs).toBe(true);
    connection.disconnect();
    expect(connection.capabilities).toEqual(EMPTY_SERVER_CAPABILITIES);
  });

  it("fails safe to all-unsupported when capability resolution throws", async () => {
    const client = fakeClient();
    (
      client.capabilities as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("probe blew up"));
    setConnectionProvider(new InjectedClientProvider({ client }));
    await connection.adoptInjected();
    expect(connection.connected).toBe(true); // connect still succeeds
    expect(connection.capabilities).toEqual(EMPTY_SERVER_CAPABILITIES); // hide on failure
  });
});

describe("transport reachability (#34)", () => {
  it("the default browser provider reaches http(s)/red but not file/unix", () => {
    // afterEach restored the default LocalUrlProvider (browser transports).
    expect(connection.canReach("http://h:5055")).toBe(true);
    expect(connection.canReach("red://localhost")).toBe(true);
    expect(connection.canReach("file:///data/app.redb")).toBe(false);
    expect(connection.supportedTransports).not.toContain("unix");
  });

  it("falls back to browser transports when a provider declares none", async () => {
    // InjectedClientProvider doesn't implement transports() → browser fallback.
    setConnectionProvider(new InjectedClientProvider({ client: fakeClient() }));
    expect(connection.canReach("file:///x")).toBe(false);
    expect(connection.canReach("https://h")).toBe(true);
  });

  it("honours a Surface that declares the desktop transport set", () => {
    setConnectionProvider(
      new LocalUrlProvider({ transports: [...DESKTOP_TRANSPORTS] })
    );
    expect(connection.canReach("file:///data/app.redb")).toBe(true);
    expect(connection.supportedTransports).toContain("unix");
  });
});

describe("boot-params pre-configuration (#36)", () => {
  it("connects to a seeded Open Contract cs without the Connect flow and returns the route", async () => {
    setConnectionProvider(
      new LocalUrlProvider({
        bootParams: { endpoint: "http://seeded:5055", to: "/cluster" },
        clientFactory: () => fakeClient(),
      })
    );
    expect(connection.connected).toBe(false);

    const view = await connection.connectFromBootParams();

    expect(view).toBe("/cluster");
    expect(connection.connected).toBe(true);
    expect(connection.active.url).toBe("http://seeded:5055");
  });

  it("returns a seeded route without connecting when no cs was seeded", async () => {
    setConnectionProvider(
      new LocalUrlProvider({ bootParams: { to: "/c/users/p/table" } })
    );
    expect(await connection.connectFromBootParams()).toBe("/c/users/p/table");
    expect(connection.connected).toBe(false);
  });

  it("still returns the seeded route when the seeded cs is unreachable", async () => {
    setConnectionProvider(
      new LocalUrlProvider({
        bootParams: { endpoint: "http://down:5055", to: "/security" },
        clientFactory: () =>
          ({
            ping: vi.fn(async () => ({ ok: false, error: "down" })),
          }) as unknown as RedClient,
      })
    );

    expect(await connection.connectFromBootParams()).toBe("/security");
    expect(connection.connected).toBe(false);
  });

  it("is a no-op (returns null) when no endpoint was seeded", async () => {
    setConnectionProvider(
      new LocalUrlProvider({ clientFactory: () => fakeClient() })
    );
    expect(await connection.connectFromBootParams()).toBeNull();
    expect(connection.connected).toBe(false);
  });

  it("never carries a token — the provider bootParams expose only endpoint/view", async () => {
    const p = new LocalUrlProvider({
      bootParams: { endpoint: "http://seeded" },
      clientFactory: () => fakeClient(),
    });
    setConnectionProvider(p);
    await connection.connectFromBootParams();
    expect(Object.keys(p.bootParams() ?? {})).toEqual(["endpoint"]);
  });
});

describe("Connection Bootstrap", () => {
  it("connects to the resolved boot target and returns the resolved route", async () => {
    setConnectionProvider(
      new LocalUrlProvider({
        clientFactory: () => fakeClient(),
      })
    );

    const route = await connection.bootstrap(async () => ({
      target: "http://bootstrap:5055",
      route: "/cluster",
    }));

    expect(route).toBe("/cluster");
    expect(connection.connected).toBe(true);
    expect(connection.active.url).toBe("http://bootstrap:5055");
  });

  it("consumes an injected-global bootstrap token to authenticate the connection", async () => {
    const clientFactory = vi.fn((_url: string, _opts?: RedClientOptions) =>
      fakeClient()
    );
    const root: Record<string, unknown> = {
      __RED_BOOTSTRAP__: {
        target: "http://managed:5055",
        token: "mock-handoff-token",
        route: "/cluster",
      },
    };
    setConnectionProvider(
      new LocalUrlProvider({
        clientFactory,
      })
    );

    const route = await connection.bootstrap(() =>
      resolveConnectionBootstrap({
        readTauri: () => null,
        readInjectedGlobal: () => readInjectedGlobalBootstrap(root),
        readUrl: () => null,
        readPersisted: () => null,
      })
    );

    expect(route).toBe("/cluster");
    expect(connection.connected).toBe(true);
    expect(clientFactory).toHaveBeenCalledWith("http://managed:5055", {
      headers: { Authorization: "Bearer mock-handoff-token" },
    });
    expect(root).not.toHaveProperty("__RED_BOOTSTRAP__");
  });

  it("consumes a hash handoff token, strips it from history, and authenticates", async () => {
    const clientFactory = vi.fn((_url: string, _opts?: RedClientOptions) =>
      fakeClient()
    );
    const replacements: string[] = [];
    const location = {
      pathname: "/app",
      search: "?cs=http://managed-hash:5055&to=/security",
      hash: "#token=mock-hash-token",
    };
    const history = {
      state: null,
      replaceState: (
        _data: unknown,
        _unused: string,
        url?: string | URL | null
      ) => {
        replacements.push(String(url));
      },
    };
    setConnectionProvider(
      new LocalUrlProvider({
        clientFactory,
      })
    );

    const route = await connection.bootstrap(() =>
      resolveConnectionBootstrap({
        readTauri: () => null,
        readInjectedGlobal: () => null,
        readUrl: () =>
          readUrlOpenContractBootstrap(location.search, location.hash, {
            consume: true,
            location,
            history,
          }),
        readPersisted: () => null,
      })
    );

    expect(route).toBe("/security");
    expect(connection.connected).toBe(true);
    expect(clientFactory).toHaveBeenCalledWith("http://managed-hash:5055", {
      headers: { Authorization: "Bearer mock-hash-token" },
    });
    expect(replacements).toEqual([
      "/app?cs=http://managed-hash:5055&to=/security",
    ]);
  });

  it("falls back to direct server auth when bootstrap has no trusted token", async () => {
    const clientFactory = vi.fn((_url: string, _opts?: RedClientOptions) =>
      fakeClient()
    );
    setConnectionProvider(
      new LocalUrlProvider({
        clientFactory,
      })
    );

    await connection.bootstrap(async () => ({
      target: "http://direct:5055",
    }));

    expect(connection.connected).toBe(true);
    expect(clientFactory).toHaveBeenCalledWith("http://direct:5055", undefined);
  });

  it("keeps the Connect flow cold when the resolver returns no target", async () => {
    expect(
      await connection.bootstrap(async () => ({ target: null }))
    ).toBeNull();
    expect(connection.connected).toBe(false);
    expect(connection.targetResolved).toBe(false);
  });
});

describe("target resolution gate (#21)", () => {
  it("an explicit connect marks the target resolved (gates auto-network)", async () => {
    // In the node test env there is no URL/stored pin, so nothing is resolved
    // until a connect happens — exactly the credential-less boot case.
    expect(connection.targetResolved).toBe(false);
    setConnectionProvider(new InjectedClientProvider({ client: fakeClient() }));
    await connection.adoptInjected();
    expect(connection.targetResolved).toBe(true);
  });
});
