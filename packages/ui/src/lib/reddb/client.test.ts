import { afterEach, describe, expect, it, vi } from "vitest";
import { RedClient } from "./client";

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
});
