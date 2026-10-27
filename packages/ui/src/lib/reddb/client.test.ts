import { afterEach, describe, expect, it, vi } from "vitest";
import { RedClient } from "./client";
import { DevConsoleStore } from "./dev-console";

describe("scoped clients", () => {
  it.each([
    { name: "object", headers: { Authorization: "Bearer host-token" } },
    {
      name: "Headers",
      headers: new Headers({ Authorization: "Bearer host-token" }),
    },
    {
      name: "tuples",
      headers: [["Authorization", "Bearer host-token"]] as [string, string][],
    },
  ])(
    "preserves $name auth and transport without owning the host lifecycle",
    async ({ headers }) => {
      const received: (string | null)[] = [];
      const fetcher: typeof fetch = async (_input, init) => {
        received.push(new Headers(init?.headers).get("Authorization"));
        init?.signal?.throwIfAborted();
        return Response.json({ collections: [] });
      };
      const host = new RedClient("https://host.example", {
        headers,
        fetch: fetcher,
      });
      const controller = new AbortController();
      const log = new DevConsoleStore();
      const scoped = host.scoped({ signal: controller.signal, console: log });
      await scoped.collections();
      if (headers instanceof Headers)
        headers.set("Authorization", "Bearer renewed-token");
      else if (Array.isArray(headers)) headers[0][1] = "Bearer renewed-token";
      else headers.Authorization = "Bearer renewed-token";
      await scoped.collections();
      controller.abort();
      await expect(scoped.collections()).rejects.toMatchObject({
        name: "AbortError",
      });
      await host.collections();
      expect(received).toEqual([
        "Bearer host-token",
        "Bearer renewed-token",
        "Bearer renewed-token",
        "Bearer renewed-token",
      ]);
      expect(log.size).toBe(3);
    }
  );
});

describe("RedClient collection metadata probing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("coalesces unsupported collection metadata route detection per base URL", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: "route not found: GET /collections/characters",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new RedClient("http://reddb.test");
    const results = await Promise.allSettled([
      client.collection("characters"),
      client.collection("grimm_graph"),
      client.collection("tales"),
    ]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("calls VCS collection and diff endpoints with the RedDB envelope shape", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/collections/products/vcs")) {
        return Response.json({
          ok: true,
          result: { collection: "products", versioned: true },
        });
      }
      if (url.includes("/repo/commits/a/diff/b?collection=products")) {
        return Response.json({
          ok: true,
          result: {
            from: "a",
            to: "b",
            added: 1,
            removed: 0,
            modified: 0,
            entries: [],
          },
        });
      }
      return Response.json({ ok: true, result: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new RedClient("http://reddb.test");

    await expect(client.collectionVcs("products")).resolves.toEqual({
      collection: "products",
      versioned: true,
    });
    await expect(
      client.commitDiff("a", "b", { collection: "products" })
    ).resolves.toMatchObject({ added: 1 });
  });

  it("polls changes with since_lsn and filters collection client-side", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        events: [
          {
            lsn: 1,
            timestamp: 1,
            operation: "insert",
            collection: "a",
            kind: "table",
          },
          {
            lsn: 2,
            timestamp: 1,
            operation: "update",
            collection: "b",
            kind: "table",
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new RedClient("http://reddb.test");
    await expect(
      client.changes(7, { collection: "b", limit: 10 })
    ).resolves.toEqual([
      {
        lsn: 2,
        timestamp: 1,
        operation: "update",
        collection: "b",
        kind: "table",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://reddb.test/changes?since_lsn=7&limit=10",
      expect.any(Object)
    );
  });

  it("merges host-provided headers into every request", async () => {
    const fetchMock = vi.fn(async () => Response.json({ collections: [] }));
    const client = new RedClient("http://reddb.test", {
      fetch: fetchMock as typeof fetch,
      headers: { Authorization: "Bearer host-token" },
    });

    await expect(client.collections()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://reddb.test/collections",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer host-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("posts auth.can checks using the server batch envelope", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        Response.json({
          ok: true,
          results: [
            {
              allowed: true,
              reason: "allow at p1.statement[0]",
              action: "config:read",
              resource: { kind: "config", name: "*" },
            },
            {
              allowed: false,
              reason: "no statement matched (default deny)",
              action: "vault:read_metadata",
              resource: { kind: "vault", name: "*" },
            },
          ],
        })
    );
    const client = new RedClient("http://reddb.test", {
      fetch: fetchMock as typeof fetch,
    });
    const checks = [
      { action: "config:read", resource: { kind: "config", name: "*" } },
      {
        action: "vault:read_metadata",
        resource: { kind: "vault", name: "*" },
      },
    ];

    await expect(client.authCan(checks)).resolves.toEqual([
      {
        action: "config:read",
        resource: { kind: "config", name: "*" },
        allowed: true,
        reason: "allow at p1.statement[0]",
      },
      {
        action: "vault:read_metadata",
        resource: { kind: "vault", name: "*" },
        allowed: false,
        reason: "no statement matched (default deny)",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://reddb.test/auth/can",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ checks }),
      })
    );
  });
});
