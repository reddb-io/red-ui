import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RedClient } from "./client";
import { devConsole } from "./dev-console";

// The console is instrumented at the client seam (#128): every query and HTTP
// call the client issues must append exactly one entry with timing, a row
// count where the response carries one, and a sanitized (secret-free) payload.

beforeEach(() => {
  devConsole.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  devConsole.clear();
});

describe("RedClient console instrumentation", () => {
  it("logs a query round-trip with its row count and sanitized query text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          query: "SELECT 1",
          record_count: 2,
          result: { columns: ["n"], records: [{ values: { n: 1 } }, { values: { n: 2 } }] },
        })
      )
    );

    const client = new RedClient("http://reddb.test");
    await client.query("SELECT * FROM users");

    const entries = devConsole.snapshot();
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry.kind).toBe("query");
    expect(entry.verb).toBe("POST");
    expect(entry.target).toBe("/query");
    expect(entry.ok).toBe(true);
    expect(entry.status).toBe(200);
    expect(entry.rowCount).toBe(2);
    expect(typeof entry.durationMs).toBe("number");
    expect(entry.payload).toContain("SELECT * FROM users");
  });

  it("marks a plain GET as an http entry without a row count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ collections: ["a", "b"] }))
    );

    const client = new RedClient("http://reddb.test");
    await client.collections();

    const [entry] = devConsole.snapshot();
    expect(entry.kind).toBe("http");
    expect(entry.verb).toBe("GET");
    expect(entry.target).toBe("/collections");
    expect(entry.rowCount).toBeUndefined();
  });

  it("redacts secrets in the logged payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true }))
    );

    const client = new RedClient("http://reddb.test", {
      fetch: undefined,
    });
    // POST with a sensitive field in the body.
    await client.ask("hello", { token: "super-secret" } as never).catch(() => {});

    const entry = devConsole.snapshot().find((e) => e.target === "/ai/ask");
    expect(entry).toBeDefined();
    expect(entry?.payload).toContain("«redacted»");
    expect(entry?.payload).not.toContain("super-secret");
  });

  it("logs a failed HTTP call with the error and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("boom", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          })
      )
    );

    const client = new RedClient("http://reddb.test");
    await expect(client.stats()).rejects.toThrow();

    const [entry] = devConsole.snapshot();
    expect(entry.ok).toBe(false);
    expect(entry.status).toBe(500);
    expect(entry.error).toContain("500");
  });

  it("logs a network failure (fetch reject) as a failed entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const client = new RedClient("http://reddb.test");
    await expect(client.stats()).rejects.toThrow("network down");

    const [entry] = devConsole.snapshot();
    expect(entry.ok).toBe(false);
    expect(entry.status).toBeUndefined();
    expect(entry.error).toContain("network down");
  });

  it("logs the streaming query endpoint with its collected row count", async () => {
    const ndjson =
      JSON.stringify({ descriptor: { columns: ["n"] } }) +
      "\n" +
      JSON.stringify({ row: { n: 1 } }) +
      "\n" +
      JSON.stringify({ row: { n: 2 } }) +
      "\n" +
      JSON.stringify({ end: { row_count: 2 } }) +
      "\n";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(ndjson, {
            status: 200,
            headers: { "Content-Type": "application/x-ndjson" },
          })
      )
    );

    const client = new RedClient("http://reddb.test");
    await client.queryStreamCollect("SELECT n FROM t");

    const [entry] = devConsole.snapshot();
    expect(entry.kind).toBe("query");
    expect(entry.target).toBe("/query/stream");
    expect(entry.ok).toBe(true);
    expect(entry.rowCount).toBe(2);
    expect(entry.payload).toContain("SELECT n FROM t");
  });
});


describe("developer request inspector capture", () => {
  it("captures sanitized response and headers while returning original data to the caller", async () => {
    const data = { result: { records: [{ values: { n: 1, password: "response-secret" } }] }, token: "top-secret" };
    const fetcher = vi.fn(async () => Response.json(data, { headers: { "set-cookie": "session=hidden", "x-request-id": "trace-1" } }));
    const client = new RedClient("http://reddb.test", { fetch: fetcher, headers: { Authorization: "Bearer hidden", "X-Client": "red-ui" } });
    const result = await client.query("SELECT n FROM t");
    expect(result).toEqual(data);
    const [entry] = devConsole.snapshot();
    expect(entry.response).toContain('"n": 1');
    expect(entry.response).not.toContain("response-secret");
    expect(entry.response).not.toContain("top-secret");
    expect(entry.requestHeaders).toContainEqual(["authorization", "«redacted»"]);
    expect(entry.responseHeaders).toContainEqual(["set-cookie", "«redacted»"]);
    expect(entry.responseHeaders).toContainEqual(["x-request-id", "trace-1"]);
  });
});
