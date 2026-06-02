// Server-side reddb HTTP client for the MCP process (#49, ADR-0006).
//
// The MCP App's data tools (`query`/`list`/`get`) answer the *model* directly —
// they run here in the Node process against the resolved connection, rather than
// driving the visual iframe. This is a focused port of the browser client in
// `packages/ui/src/lib/reddb/client.ts`: it covers only the read endpoints the
// data tools need (`/query`, `/query/stream`, `/collections`) and reuses Node's
// global `fetch` (Node >= 20). It is NOT @reddb-io/client — endpoints mirror the
// hand-rolled UI client, verified against reddb's routing.rs.
//
// Auth lives entirely in the `headers` passed to the constructor; it is never
// logged and never returned in tool output (acceptance: no secret/token leaks).

export interface QueryRow {
  values: Record<string, unknown>;
  edges?: Record<string, unknown>;
  nodes?: Record<string, unknown>;
  paths?: unknown[];
}

export interface QueryResult {
  ok: boolean;
  query: string;
  capability?: string;
  engine?: string;
  mode?: string;
  record_count: number;
  result: { columns: string[]; records: QueryRow[] };
  error?: string;
  /** True when assembled from the NDJSON stream rather than buffered `/query`. */
  streamed?: boolean;
  /** True when streaming stopped at `maxRows` with more rows on the server. */
  truncated?: boolean;
}

/** Result of collecting a read-only SELECT over the NDJSON streaming endpoint. */
export interface StreamedQueryResult {
  columns: string[];
  schemaFingerprint?: string;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  cursor?: string;
}

export interface RedClientOptions {
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

/** One NDJSON frame from `POST /query/stream`. Discriminated by its single key. */
type NdjsonFrame =
  | { descriptor: { columns: string[]; schema_fingerprint?: string } }
  | { cursor: { token: string; snapshot_lsn?: number; resumable?: boolean } }
  | { row: Record<string, unknown> }
  | { end: { row_count?: number } }
  | { cancelled: Record<string, unknown> };

/**
 * Parse a chunked `application/x-ndjson` body into one frame per line. Buffers
 * across chunk boundaries and flushes a trailing newline-less line at EOF.
 */
async function* parseNdjsonFrames(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<NdjsonFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) yield JSON.parse(line) as NdjsonFrame;
      }
    }
    const tail = buf.trim();
    if (tail) yield JSON.parse(tail) as NdjsonFrame;
  } finally {
    reader.releaseLock();
  }
}

const SELECT_RE = /^\s*select\b/i;

export class RedClient {
  readonly baseUrl: string;
  private readonly headers: Record<string, string> | undefined;
  private readonly fetcher: typeof fetch;

  constructor(baseUrl: string, opts: RedClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.headers = opts.headers;
    this.fetcher = opts.fetch ?? fetch;
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.headers,
      ...(init?.headers as Record<string, string> | undefined),
    };

    const res = await this.fetcher(url, { ...init, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // The error body is the server's response, not our request — it never
      // contains the auth header we sent. Truncated to keep tool output terse.
      throw new Error(
        `${init?.method ?? "GET"} ${path} → ${res.status} ${body.slice(0, 200)}`
      );
    }
    return res.json() as Promise<T>;
  }

  /** Buffered query (`POST /query`). */
  async query(query: string): Promise<QueryResult> {
    return this.json<QueryResult>("/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  async collections(): Promise<string[]> {
    const r = await this.json<{ collections: string[] }>("/collections");
    return r.collections ?? [];
  }

  /**
   * Stream a read-only SELECT through `POST /query/stream` (NDJSON, chunked),
   * collecting up to `maxRows` before cancelling the server cursor. Throws for a
   * non-SELECT (server `400`) and for an absent route on an older server (`404`)
   * — callers fall back to {@link query}.
   */
  async queryStreamCollect(
    query: string,
    opts: { maxRows?: number; signal?: AbortSignal } = {}
  ): Promise<StreamedQueryResult> {
    const maxRows = opts.maxRows ?? 10_000;
    const res = await this.fetcher(`${this.baseUrl}/query/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
        ...this.headers,
      },
      body: JSON.stringify({ query }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) {
      const body = res.body ? await res.text().catch(() => "") : "";
      throw new Error(
        `POST /query/stream → ${res.status} ${body.slice(0, 200)}`
      );
    }

    const out: StreamedQueryResult = {
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
    };

    for await (const frame of parseNdjsonFrames(res.body)) {
      if ("descriptor" in frame) {
        out.columns = frame.descriptor.columns ?? [];
        out.schemaFingerprint = frame.descriptor.schema_fingerprint;
      } else if ("cursor" in frame) {
        out.cursor = frame.cursor.token;
      } else if ("row" in frame) {
        if (out.rows.length >= maxRows) {
          out.truncated = true;
          break;
        }
        out.rows.push(frame.row);
        out.rowCount = out.rows.length;
      } else if ("end" in frame || "cancelled" in frame) {
        break;
      }
    }

    if (out.truncated && out.cursor) {
      await this.cancelQueryStream(out.cursor).catch(() => {
        // best-effort: the cursor TTL reclaims it anyway.
      });
    }
    return out;
  }

  /** Cancel a streaming-query cursor server-side (`POST /query/stream/cancel`). */
  async cancelQueryStream(cursor: string): Promise<void> {
    await this.json("/query/stream/cancel", {
      method: "POST",
      body: JSON.stringify({ cursor }),
    }).catch(() => undefined);
  }
}

/** A read-only client surface — the only methods the data tools depend on. So
 *  tests can pass a mock, and #48's local-spawn path can supply its own. */
export type ReadClient = Pick<
  RedClient,
  "query" | "collections" | "queryStreamCollect"
>;

/**
 * Run a read SELECT preferring the bounded-memory NDJSON stream, falling back to
 * the buffered `POST /query` for everything the stream can't take — a non-SELECT
 * statement, a network error, or an older server with no `/query/stream` route.
 * Honest streaming negotiation (#22): identical to {@link RedClient.query}
 * unless the server supports streaming AND the statement is a SELECT.
 */
export async function runQueryPreferStream(
  client: ReadClient,
  sql: string,
  opts: { maxRows?: number; signal?: AbortSignal } = {}
): Promise<QueryResult> {
  if (!SELECT_RE.test(sql)) return client.query(sql);
  try {
    const s = await client.queryStreamCollect(sql, opts);
    return {
      ok: true,
      query: sql,
      record_count: s.rowCount,
      result: {
        columns: s.columns,
        records: s.rows.map((values) => ({ values })),
      },
      streamed: true,
      truncated: s.truncated,
    };
  } catch {
    return client.query(sql);
  }
}
