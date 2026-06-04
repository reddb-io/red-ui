import { describe, expect, it, vi } from "vitest";
import { RedClient, runQueryPreferStream } from "./client";

// Build a fake Response whose body is a ReadableStream of the given chunks,
// so we can exercise the NDJSON frame parser across arbitrary chunk splits.
function ndjsonResponse(chunks: string[], status = 200): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    body: status >= 200 && status < 300 ? stream : null,
    text: async () => "",
  } as unknown as Response;
}

const DESCRIPTOR =
  '{"descriptor":{"columns":["id","name"],"schema_fingerprint":"abc"}}\n';
const CURSOR =
  '{"cursor":{"token":"deadbeef","snapshot_lsn":42,"resumable":true}}\n';

describe("queryStreamCollect", () => {
  it("collects descriptor + rows + end into a StreamedQueryResult", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL) =>
      ndjsonResponse([
        DESCRIPTOR,
        CURSOR,
        '{"row":{"id":1,"name":"alice"}}\n',
        '{"row":{"id":2,"name":"bob"}}\n',
        '{"end":{"row_count":2}}\n',
      ])
    );
    const client = new RedClient("http://h:5055", { fetch });
    const r = await client.queryStreamCollect("SELECT * FROM users");

    expect(r.columns).toEqual(["id", "name"]);
    expect(r.schemaFingerprint).toBe("abc");
    expect(r.rows).toEqual([
      { id: 1, name: "alice" },
      { id: 2, name: "bob" },
    ]);
    expect(r.rowCount).toBe(2);
    expect(r.truncated).toBe(false);
    expect(String(fetch.mock.calls[0][0])).toBe("http://h:5055/query/stream");
  });

  it("reassembles a row JSON split across chunk boundaries", async () => {
    const fetch = vi.fn(async () =>
      ndjsonResponse([
        DESCRIPTOR + '{"row":{"id":1,"na',
        'me":"split"}}\n{"end":{"row_count":1}}\n',
      ])
    );
    const client = new RedClient("http://h", { fetch });
    const r = await client.queryStreamCollect("SELECT 1");
    expect(r.rows).toEqual([{ id: 1, name: "split" }]);
  });

  it("flushes a trailing line with no newline at EOF", async () => {
    const fetch = vi.fn(async () =>
      ndjsonResponse([DESCRIPTOR + '{"row":{"id":9}}\n{"end":{"row_count":1}}'])
    );
    const client = new RedClient("http://h", { fetch });
    const r = await client.queryStreamCollect("SELECT 1");
    expect(r.rows).toEqual([{ id: 9 }]);
  });

  it("caps at maxRows, marks truncated, and cancels the server cursor", async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/query/stream/cancel")) {
        return {
          ok: true,
          status: 200,
          body: null,
          json: async () => ({ ok: true }),
        } as unknown as Response;
      }
      return ndjsonResponse([
        DESCRIPTOR,
        CURSOR,
        '{"row":{"id":1}}\n',
        '{"row":{"id":2}}\n',
        '{"row":{"id":3}}\n',
        '{"end":{"row_count":3}}\n',
      ]);
    });
    const client = new RedClient("http://h", { fetch });
    const r = await client.queryStreamCollect("SELECT * FROM big", {
      maxRows: 1,
    });

    expect(r.rows).toEqual([{ id: 1 }]);
    expect(r.truncated).toBe(true);
    expect(calls).toContain("http://h/query/stream/cancel");
  });

  it("throws on a non-ok response (e.g. 400 unsupported / 404 missing route)", async () => {
    const fetch = vi.fn(async () => ndjsonResponse([], 400));
    const client = new RedClient("http://h", { fetch });
    await expect(client.queryStreamCollect("UPDATE x SET y=1")).rejects.toThrow(
      /\/query\/stream → 400/
    );
  });
});

describe("runQueryPreferStream", () => {
  it("streams a SELECT and assembles a QueryResult (streamed flag set)", async () => {
    const client = {
      query: vi.fn(),
      queryStreamCollect: vi.fn(async () => ({
        columns: ["id"],
        rows: [{ id: 1 }, { id: 2 }],
        rowCount: 2,
        truncated: false,
      })),
    };
    const r = await runQueryPreferStream(client, "SELECT * FROM t");
    expect(client.queryStreamCollect).toHaveBeenCalledOnce();
    expect(client.query).not.toHaveBeenCalled();
    expect(r.streamed).toBe(true);
    expect(r.record_count).toBe(2);
    expect(r.result.records).toEqual([
      { values: { id: 1 } },
      { values: { id: 2 } },
    ]);
  });

  it("propagates truncated through to the QueryResult", async () => {
    const client = {
      query: vi.fn(),
      queryStreamCollect: vi.fn(async () => ({
        columns: ["id"],
        rows: [{ id: 1 }],
        rowCount: 1,
        truncated: true,
      })),
    };
    const r = await runQueryPreferStream(client, "select * from t", {
      maxRows: 1,
    });
    expect(r.truncated).toBe(true);
  });

  it("does NOT stream a non-SELECT — goes straight to buffered query()", async () => {
    const buffered = {
      ok: true,
      query: "x",
      record_count: 0,
      result: { columns: [], records: [] },
    };
    const client = {
      query: vi.fn(async () => buffered),
      queryStreamCollect: vi.fn(),
    };
    const r = await runQueryPreferStream(client, "INSERT INTO t VALUES (1)");
    expect(client.queryStreamCollect).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("INSERT INTO t VALUES (1)");
    expect(r).toBe(buffered);
  });

  it("passes AbortSignal through to non-SELECT buffered query()", async () => {
    const controller = new AbortController();
    const buffered = {
      ok: true,
      query: "x",
      record_count: 0,
      result: { columns: [], records: [] },
    };
    const client = {
      query: vi.fn(async () => buffered),
      queryStreamCollect: vi.fn(),
    };

    await runQueryPreferStream(client, "INSERT INTO t VALUES (1)", {
      signal: controller.signal,
    });

    expect(client.query).toHaveBeenCalledWith("INSERT INTO t VALUES (1)", {
      signal: controller.signal,
    });
  });

  it("falls back to buffered query() when streaming fails (older server / 404)", async () => {
    const buffered = {
      ok: true,
      query: "x",
      record_count: 0,
      result: { columns: [], records: [] },
    };
    const client = {
      query: vi.fn(async () => buffered),
      queryStreamCollect: vi.fn(async () => {
        throw new Error("POST /query/stream → 404");
      }),
    };
    const r = await runQueryPreferStream(client, "SELECT * FROM t");
    expect(client.queryStreamCollect).toHaveBeenCalledOnce();
    expect(client.query).toHaveBeenCalledWith("SELECT * FROM t");
    expect(r).toBe(buffered);
  });

  it("does not fall back to buffered query() after an abort", async () => {
    const err = new DOMException("Aborted", "AbortError");
    const controller = new AbortController();
    controller.abort();
    const client = {
      query: vi.fn(),
      queryStreamCollect: vi.fn(async () => {
        throw err;
      }),
    };

    await expect(
      runQueryPreferStream(client, "SELECT * FROM t", {
        signal: controller.signal,
      })
    ).rejects.toBe(err);
    expect(client.query).not.toHaveBeenCalled();
  });
});
