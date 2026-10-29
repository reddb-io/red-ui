import { describe, expect, it, vi } from "vitest";
import { RedClient } from "./client";
import {
  NotConnectedError,
  UnknownConnectionError,
  UnreachableConnectionError,
  type ActiveConnection,
  type Connection,
  type ConnectionProvider,
  type Identity,
} from "./connection-provider";
import { runConnectionProviderContract } from "./connection-provider.contract";
import { LocalUrlProvider, type HistoryStore } from "./local-url-provider";

const PRESETS: Connection[] = [
  {
    id: "embedded",
    label: "Embedded",
    url: "http://localhost:5055",
    role: "embedded",
  },
  {
    id: "docker-primary",
    label: "Docker primary",
    url: "http://localhost:15055",
    role: "primary",
  },
];

function memoryHistory(): HistoryStore {
  let entries: any[] = [];
  return {
    load: () => entries.slice(),
    save: (next) => {
      entries = next.slice();
    },
  };
}

function fakeClient(_url: string): RedClient {
  return {
    ping: vi.fn().mockResolvedValue({ ok: true, rtt_ms: 7 }),
    whoami: vi.fn().mockResolvedValue({
      ok: true,
      authenticated: true,
      username: "admin",
      role: "admin",
    }),
  } as unknown as RedClient;
}

function buildLocal(): LocalUrlProvider {
  return new LocalUrlProvider({
    presets: PRESETS,
    history: memoryHistory(),
    clientFactory: fakeClient,
  });
}

runConnectionProviderContract("LocalUrlProvider", () => ({
  provider: buildLocal(),
  knownId: "embedded",
  unknownId: "not-a-real-id",
}));

// In-memory mock provider — exercises the contract from the other side.
class MockProvider implements ConnectionProvider {
  private active: ActiveConnection | null = null;
  constructor(private readonly entries: Connection[]) {}
  async list(): Promise<Connection[]> {
    return this.entries.slice();
  }
  async connect(id: string): Promise<ActiveConnection> {
    const hit = this.entries.find((c) => c.id === id);
    if (!hit) throw new UnknownConnectionError(id);
    const active: ActiveConnection = {
      connection: hit,
      client: {} as RedClient,
      rtt_ms: 0,
    };
    this.active = active;
    return active;
  }
  async whoami(): Promise<Identity> {
    if (!this.active) throw new NotConnectedError();
    return { authenticated: false, username: "anonymous", role: "guest" };
  }
}

runConnectionProviderContract("MockProvider", () => ({
  provider: new MockProvider([
    { id: "mock-a", label: "A", url: "http://a" },
    { id: "mock-b", label: "B", url: "http://b" },
  ]),
  knownId: "mock-a",
  unknownId: "mock-z",
}));

describe("LocalUrlProvider — implementation-specific", () => {
  it("list() merges presets and history (presets first, dedup by url)", async () => {
    const history = memoryHistory();
    history.save([
      { url: "http://10.0.0.5:5055", label: "10.0.0.5", last_used: 1 },
    ]);
    const p = new LocalUrlProvider({
      presets: PRESETS,
      history,
      clientFactory: fakeClient,
    });
    const items = await p.list();
    expect(items.map((c) => c.id)).toEqual([
      "embedded",
      "docker-primary",
      "http://10.0.0.5:5055",
    ]);
  });

  it("connect(url) accepts an ad-hoc URL not present in presets/history", async () => {
    const p = buildLocal();
    const active = await p.connect("http://192.168.1.10:5055");
    expect(active.connection.url).toBe("http://192.168.1.10:5055");
    expect(active.rtt_ms).toBe(7);
  });

  it("connect records the URL in history with rtt and label", async () => {
    const history = memoryHistory();
    const p = new LocalUrlProvider({
      presets: PRESETS,
      history,
      clientFactory: fakeClient,
    });
    await p.connect("embedded");
    expect(history.load()).toEqual([
      expect.objectContaining({ url: "http://localhost:5055", rtt_ms: 7 }),
    ]);
  });

  it("connect raises UnreachableConnectionError when ping fails", async () => {
    const failing = (_url: string) =>
      ({
        ping: vi.fn().mockResolvedValue({ ok: false, error: "ECONNREFUSED" }),
        whoami: vi.fn(),
      }) as unknown as RedClient;
    const p = new LocalUrlProvider({
      presets: PRESETS,
      history: memoryHistory(),
      clientFactory: failing,
    });
    await expect(p.connect("embedded")).rejects.toBeInstanceOf(
      UnreachableConnectionError
    );
  });

  it("uses a handoff token as a one-shot bearer header and never writes it to history", async () => {
    const history = memoryHistory();
    const clientFactory = vi.fn(fakeClient);
    const p = new LocalUrlProvider({
      presets: PRESETS,
      history,
      clientFactory,
    });

    p.useHandoffToken("http://localhost:5055", "mock-handoff-token");
    await p.connect("embedded");
    await p.connect("embedded");

    expect(clientFactory).toHaveBeenNthCalledWith(1, "http://localhost:5055", {
      headers: { Authorization: "Bearer mock-handoff-token" },
    });
    expect(clientFactory).toHaveBeenNthCalledWith(
      2,
      "http://localhost:5055",
      undefined
    );
    expect(JSON.stringify(history.load())).not.toContain("mock-handoff-token");
  });

  it("resolves a file:// target through the embedded resolver, keeping file:// for display", async () => {
    const clientFactory = vi.fn(fakeClient);
    const embeddedResolver = vi
      .fn<(u: string) => Promise<string>>()
      .mockResolvedValue("http://127.0.0.1:48211");
    const p = new LocalUrlProvider({
      presets: [],
      history: memoryHistory(),
      clientFactory,
      embeddedResolver,
    });

    const active = await p.connect("file://./test.rdb");

    // The resolver saw the original file:// string…
    expect(embeddedResolver).toHaveBeenCalledWith("file://./test.rdb");
    // …the client was built against the resolved local URL…
    expect(clientFactory).toHaveBeenCalledWith(
      "http://127.0.0.1:48211",
      undefined
    );
    // …but the connection's identity stays the file path the user typed.
    expect(active.connection.url).toBe("file://./test.rdb");
  });

  it("surfaces a failed embedded resolve as UnreachableConnectionError", async () => {
    const p = new LocalUrlProvider({
      presets: [],
      history: memoryHistory(),
      clientFactory: fakeClient,
      embeddedResolver: vi
        .fn<(u: string) => Promise<string>>()
        .mockRejectedValue(new Error("sidecar `red` unavailable")),
    });
    await expect(p.connect("file://./missing.rdb")).rejects.toBeInstanceOf(
      UnreachableConnectionError
    );
  });

  it("leaves http targets untouched even when an embedded resolver is present", async () => {
    const clientFactory = vi.fn(fakeClient);
    const embeddedResolver = vi
      .fn<(u: string) => Promise<string>>()
      .mockResolvedValue("http://127.0.0.1:1");
    const p = new LocalUrlProvider({
      presets: [],
      history: memoryHistory(),
      clientFactory,
      embeddedResolver,
    });
    await p.connect("http://host:5055");
    expect(embeddedResolver).not.toHaveBeenCalled();
    expect(clientFactory).toHaveBeenCalledWith("http://host:5055", undefined);
  });

  it("history is capped at historyMax", async () => {
    const history = memoryHistory();
    const p = new LocalUrlProvider({
      presets: [],
      history,
      clientFactory: fakeClient,
      historyMax: 2,
    });
    await p.connect("http://a:5055");
    await p.connect("http://b:5055");
    await p.connect("http://c:5055");
    expect(history.load().map((e) => e.url)).toEqual([
      "http://c:5055",
      "http://b:5055",
    ]);
  });

  it("forget removes a URL from history", async () => {
    const history = memoryHistory();
    const p = new LocalUrlProvider({
      presets: [],
      history,
      clientFactory: fakeClient,
    });
    await p.connect("http://a:5055");
    p.forget("http://a:5055");
    expect(history.load()).toEqual([]);
  });
});
