// Real HTTP client for a running reddb instance.
// Endpoints discovered from reddb/crates/reddb-server/src/server/routing.rs.

import {
  capabilitiesFromSignal,
  EMPTY_SERVER_CAPABILITIES,
  type RawCapabilities,
  type ServerCapabilities,
} from "./server-capabilities";
import type {
  PermissionCheck,
  PermissionDecision,
  PermissionResource,
} from "../permission-gate";

export interface QueryRow {
  values: Record<string, unknown>;
  edges?: Record<string, unknown>;
  nodes?: Record<string, unknown>;
  paths?: unknown[];
  vector_results?: Array<{
    id?: number | string;
    collection?: string;
    distance?: number;
    vector?: number[];
    metadata?: Record<string, unknown>;
    linked_node?: string;
    linked_row?: [string, number];
  }>;
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
  /** True when this result was assembled from the NDJSON streaming endpoint
   *  (`POST /query/stream`) rather than the buffered `POST /query`. */
  streamed?: boolean;
  /** True when streaming stopped at `maxRows` and more rows remained on the
   *  server (the cursor was cancelled). Surfaced so the UI never silently
   *  drops rows. */
  truncated?: boolean;
}

/** Result of collecting a read-only SELECT over the NDJSON streaming endpoint. */
export interface StreamedQueryResult {
  columns: string[];
  schemaFingerprint?: string;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  /** Hit the `maxRows` cap with more rows still on the server. */
  truncated: boolean;
  /** Opaque resume token from the `cursor` frame, if one was emitted. */
  cursor?: string;
}

export interface CollectionMetadata {
  ok?: boolean;
  name: string;
  kind?: string;
  capability?: string;
  capabilities?: string[];
  schema?: Record<string, unknown>;
  indexes?: Array<Record<string, unknown>>;
  retention?: Record<string, unknown>;
  tenant?: string;
  actions?: Record<string, boolean | { allowed: boolean; reason?: string }>;
}

export interface Stats {
  active_connections: number;
  idle_connections: number;
  started_at_unix_ms: number;
  store: {
    collection_count: number;
    cross_ref_count: number;
    total_entities: number;
    total_memory_bytes: number;
  };
  system: {
    arch: string;
    cpu_cores: number;
    hostname: string;
    os: string;
    pid: number;
    total_memory_bytes: number;
    available_memory_bytes: number;
  };
  kv?: {
    gets: number;
    puts: number;
    deletes: number;
    cas_success: number;
    cas_conflict: number;
  };
  /**
   * Set by the server when the store is open read-only — e.g. an embedded file
   * already held by an active writer (lock detection is owned by reddb). Absent
   * when the server reports no read-only signal, in which case the UI shows no
   * badge and behaves normally (#23). `read_only_reason` is an optional
   * human-facing explanation for the badge tooltip.
   */
  read_only?: boolean;
  read_only_reason?: string;
}

export interface ClusterStatus {
  ok?: boolean;
  deployment?: {
    mode?: "embedded" | "server" | "docker" | "replicated" | string;
    file_path?: string;
    process_kind?: string;
    container_id?: string;
    image?: string;
    configured_by?: string;
  };
  storage?: {
    capacity_bytes?: number;
    used_bytes?: number;
    free_bytes?: number;
  };
  wal?: {
    size_bytes?: number;
    lsn?: number;
    oldest_lsn?: number;
  };
  throughput?: {
    requests_per_second?: number;
    reads_per_second?: number;
    writes_per_second?: number;
    avg_response_ms?: number;
  };
  system?: {
    cpu_usage_percent?: number;
    memory_used_bytes?: number;
    memory_total_bytes?: number;
  };
  replication?: {
    replica_count?: number;
    lag_ms?: number;
    lag_lsn?: number;
  };
}

export interface ReplicationStatus {
  ok: boolean;
  role: "primary" | "replica" | "standalone";
  state?: "healthy" | "lagging" | "disconnected";
  primary_addr?: string;
  /** primary perspective */
  wal_lsn?: number;
  oldest_lsn?: number;
  replica_count?: number;
  /** replica perspective */
  last_applied_lsn?: number;
  last_seen_primary_lsn?: number;
  last_seen_oldest_lsn?: number;
}

export interface Whoami {
  ok: boolean;
  authenticated: boolean;
  username: string;
  role: string;
  note?: string;
}

export interface RedClientOptions {
  headers?: HeadersInit;
  fetch?: typeof fetch;
}

export interface AuthUser {
  username: string;
  role?: string;
  created_at?: number;
  last_active?: number;
  mfa?: boolean;
}

export interface AuthTenant {
  id?: string;
  name?: string;
  slug?: string;
  role?: string;
  grants?: string[];
  created_at?: number;
}

export interface AuthPolicy {
  id?: string;
  name?: string;
  tenant?: string;
  principal?: string;
  resource?: string;
  action?: string;
  effect?: "allow" | "deny" | string;
  description?: string;
  created_at?: number;
}

interface AuthCanResponse {
  ok?: boolean;
  results?: Array<Partial<PermissionDecision>>;
  error?: string;
}

export interface ChangeEvent {
  lsn: number;
  timestamp: number;
  collection: string;
  kind: string;
  operation: "insert" | "update" | "delete" | "refresh";
  rid?: number;
}

export interface VcsEnvelope<T> {
  ok: boolean;
  result: T;
  error?: string;
}

export interface CollectionVcsState {
  collection: string;
  versioned: boolean;
}

export interface VcsAuthor {
  name: string;
  email: string;
}

export interface VcsCommit {
  hash: string;
  root_xid?: number;
  parents: string[];
  height?: number;
  author?: VcsAuthor;
  committer?: VcsAuthor;
  message: string;
  timestamp_ms: number;
  signature?: string;
}

export interface VcsDiffEntry {
  collection: string;
  entity_id: string;
  change: "added" | "removed" | "modified" | string;
  before?: unknown;
  after?: unknown;
}

export interface VcsDiff {
  from: string;
  to: string;
  added: number;
  removed: number;
  modified: number;
  entries: VcsDiffEntry[];
}

const unsupportedCollectionMetadata = new Set<string>();
const collectionMetadataSupportProbe = new Map<string, Promise<boolean>>();

function isUnsupportedCollectionMetadataRoute(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return message.includes("route not found: GET /collections/");
}

/**
 * Generalised "the server doesn't have this route" check (#22). `json()`
 * throws `<METHOD> <path> → <status> <body>`, so a 404 or a "route not found"
 * body both signal an unsupported route. Distinct from auth/5xx/network errors
 * — but capability negotiation treats *any* probe failure as unsupported
 * (fail safe), so this is only used to tell "route absent" from "signal
 * present" when reading the stable `/capabilities` endpoint.
 */
function isUnsupportedRoute(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return / → 404\b/.test(message) || message.includes("route not found");
}

function unsupportedCollectionMetadataError(baseUrl: string): Error {
  return new Error(
    `GET /collections/:name unsupported by this reddb server (${baseUrl})`
  );
}

function isPermissionResource(value: unknown): value is PermissionResource {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PermissionResource>;
  return (
    typeof candidate.kind === "string" &&
    candidate.kind.length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    (candidate.tenant === undefined || typeof candidate.tenant === "string")
  );
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
 * across chunk boundaries (a JSON object split over two TCP reads is emitted
 * exactly once, in order) and flushes a trailing newline-less line at EOF.
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

/**
 * Run a query, preferring the bounded-memory NDJSON stream for a plain SELECT
 * and falling back to the buffered `POST /query` for everything else — and for
 * any streaming failure (network, a non-SELECT 400, or an older server with no
 * `/query/stream` route returning 404). The fallback makes this strictly safe:
 * behaviour is identical to {@link RedClient.query} unless the server supports
 * streaming AND the statement is a SELECT, in which case the server streams
 * rows instead of buffering the whole result set.
 */
export async function runQueryPreferStream(
  client: Pick<RedClient, "query" | "queryStreamCollect">,
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

export class RedClient {
  readonly baseUrl: string;
  private readonly headers: HeadersInit | undefined;
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
    };
    Object.assign(headers, this.headers as Record<string, string> | undefined);
    Object.assign(headers, init?.headers as Record<string, string> | undefined);

    const res = await this.fetcher(url, { ...init, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `${init?.method ?? "GET"} ${path} → ${res.status} ${body.slice(0, 200)}`
      );
    }
    return res.json() as Promise<T>;
  }

  async stats(): Promise<Stats> {
    return this.json<Stats>("/stats");
  }

  async clusterStatus(): Promise<ClusterStatus> {
    return this.json<ClusterStatus>("/cluster/status");
  }

  async ping(): Promise<
    { ok: true; rtt_ms: number } | { ok: false; error: string }
  > {
    const start = performance.now();
    try {
      await this.json("/stats");
      return { ok: true, rtt_ms: Math.round(performance.now() - start) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * Resolve the server's capability map (#22). Prefers the stable
   * `/capabilities` signal; when that route is absent (older server), infers
   * from lightweight, side-effect-free GET probes. Any non-404 failure
   * (network, auth, 5xx) fails safe to the empty map, so the UI hides controls
   * rather than showing ones the server can't honour.
   */
  async capabilities(): Promise<ServerCapabilities> {
    try {
      const raw = await this.json<RawCapabilities>("/capabilities");
      return capabilitiesFromSignal(raw);
    } catch (e) {
      // Only an absent route falls through to inference; anything else (a
      // flaky network, an auth wall, a 5xx) hides everything.
      if (!isUnsupportedRoute(e)) return { ...EMPTY_SERVER_CAPABILITIES };
    }
    const [vcs, clusterStatus] = await Promise.all([
      this.probeGet("/repo/commits?limit=1"),
      this.probeGet("/cluster/status"),
    ]);
    return { ...EMPTY_SERVER_CAPABILITIES, vcs, clusterStatus };
  }

  /** True iff a GET to `path` succeeds; any failure (404/auth/5xx/network) is
   *  treated as unsupported — the fail-safe-to-hide rule of #22. */
  private async probeGet(path: string): Promise<boolean> {
    try {
      await this.json(path);
      return true;
    } catch {
      return false;
    }
  }

  async collections(): Promise<string[]> {
    const r = await this.json<{ collections: string[] }>("/collections");
    return r.collections;
  }

  async collection(name: string): Promise<CollectionMetadata> {
    if (unsupportedCollectionMetadata.has(this.baseUrl)) {
      throw unsupportedCollectionMetadataError(this.baseUrl);
    }

    const path = `/collections/${encodeURIComponent(name)}`;
    const inFlightProbe = collectionMetadataSupportProbe.get(this.baseUrl);
    if (inFlightProbe) {
      const supported = await inFlightProbe;
      if (!supported) throw unsupportedCollectionMetadataError(this.baseUrl);
      return this.json<CollectionMetadata>(path);
    }

    let resolveProbe: (supported: boolean) => void;
    const probe = new Promise<boolean>((resolve) => {
      resolveProbe = resolve;
    });
    collectionMetadataSupportProbe.set(this.baseUrl, probe);

    try {
      const metadata = await this.json<CollectionMetadata>(path);
      resolveProbe!(true);
      return metadata;
    } catch (e) {
      if (isUnsupportedCollectionMetadataRoute(e)) {
        unsupportedCollectionMetadata.add(this.baseUrl);
        resolveProbe!(false);
      } else {
        resolveProbe!(true);
      }
      throw e;
    } finally {
      collectionMetadataSupportProbe.delete(this.baseUrl);
    }
  }

  async createCollection(name: string): Promise<void> {
    await this.json("/collections", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async insertDocument(
    collection: string,
    doc: Record<string, unknown>
  ): Promise<{ id: number }> {
    return this.json<{ id: number }>(
      `/collections/${encodeURIComponent(collection)}/documents`,
      {
        method: "POST",
        body: JSON.stringify(doc),
      }
    );
  }

  async query(query: string): Promise<QueryResult> {
    return this.json<QueryResult>("/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  /**
   * Stream a read-only SELECT through `POST /query/stream` (NDJSON, chunked).
   * The server emits rows through a bounded-memory channel — it never buffers
   * the whole result — and we collect up to `maxRows` (default 10 000) before
   * cancelling the server cursor. The NDJSON frame order is fixed
   * (`descriptor` → `cursor` → `row`* → `end`|`cancelled`), verified against
   * ../reddb/docs/api/query-streaming.md.
   *
   * Throws for a non-SELECT (server `400 stream_unsupported_statement`) and for
   * an absent route on an older server (`404`) — callers fall back to
   * {@link query}. Browser-reachable: this is `fetch` + `ReadableStream`, not
   * `EventSource` (the endpoint is POST-based).
   */
  async queryStreamCollect(
    query: string,
    opts: { maxRows?: number; signal?: AbortSignal } = {}
  ): Promise<StreamedQueryResult> {
    const maxRows = opts.maxRows ?? 10_000;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    };
    Object.assign(headers, this.headers as Record<string, string> | undefined);

    const res = await this.fetcher(`${this.baseUrl}/query/stream`, {
      method: "POST",
      headers,
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

    // We stopped early with more rows on the server — release the pinned cursor.
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

  async collectionVcs(name: string): Promise<CollectionVcsState> {
    const r = await this.json<VcsEnvelope<CollectionVcsState>>(
      `/collections/${encodeURIComponent(name)}/vcs`
    );
    return r.result;
  }

  async setCollectionVcs(
    name: string,
    versioned: boolean
  ): Promise<CollectionVcsState> {
    const r = await this.json<VcsEnvelope<CollectionVcsState>>(
      `/collections/${encodeURIComponent(name)}/vcs`,
      {
        method: "PUT",
        body: JSON.stringify({ versioned }),
      }
    );
    return r.result;
  }

  async commits(
    opts: {
      from?: string;
      to?: string;
      branch?: string;
      limit?: number;
      skip?: number;
      noMerges?: boolean;
    } = {}
  ): Promise<VcsCommit[]> {
    const qs = new URLSearchParams();
    if (opts.from) qs.set("from", opts.from);
    if (opts.to) qs.set("to", opts.to);
    if (opts.branch) qs.set("branch", opts.branch);
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.skip !== undefined) qs.set("skip", String(opts.skip));
    if (opts.noMerges !== undefined) qs.set("no_merges", String(opts.noMerges));
    const suffix = qs.toString() ? `?${qs}` : "";
    const r = await this.json<VcsEnvelope<VcsCommit[]>>(
      `/repo/commits${suffix}`
    );
    return r.result;
  }

  async commitDiff(
    from: string,
    to: string,
    opts: { collection?: string; summary?: boolean } = {}
  ): Promise<VcsDiff> {
    const qs = new URLSearchParams();
    if (opts.collection) qs.set("collection", opts.collection);
    if (opts.summary !== undefined) qs.set("summary", String(opts.summary));
    const suffix = qs.toString() ? `?${qs}` : "";
    const r = await this.json<VcsEnvelope<VcsDiff>>(
      `/repo/commits/${encodeURIComponent(from)}/diff/${encodeURIComponent(to)}${suffix}`
    );
    return r.result;
  }

  async replication(): Promise<ReplicationStatus> {
    return this.json<ReplicationStatus>("/replication/status").catch(() => ({
      ok: false,
      role: "standalone" as const,
    }));
  }

  async whoami(): Promise<Whoami> {
    return this.json<Whoami>("/auth/whoami");
  }

  async users(): Promise<AuthUser[]> {
    const r = await this.json<{ ok: boolean; users: AuthUser[] }>(
      "/auth/users"
    );
    return r.users;
  }

  async tenants(): Promise<AuthTenant[]> {
    const r = await this.json<{ ok: boolean; tenants: AuthTenant[] }>(
      "/auth/tenants"
    );
    return r.tenants ?? [];
  }

  async policies(): Promise<AuthPolicy[]> {
    const r = await this.json<{ ok: boolean; policies: AuthPolicy[] }>(
      "/auth/policies"
    );
    return r.policies ?? [];
  }

  async authCan(checks: PermissionCheck[]): Promise<PermissionDecision[]> {
    const r = await this.json<AuthCanResponse>("/auth/can", {
      method: "POST",
      body: JSON.stringify({ checks }),
    });
    if (!Array.isArray(r.results)) {
      throw new Error(r.error ?? "POST /auth/can returned no results");
    }
    return checks.map((check, index) => {
      const result = r.results?.[index] ?? {};
      const resource = isPermissionResource(result.resource)
        ? result.resource
        : check.resource;
      return {
        action:
          typeof result.action === "string" ? result.action : check.action,
        resource,
        current_tenant:
          typeof result.current_tenant === "string"
            ? result.current_tenant
            : check.current_tenant,
        allowed: result.allowed === true,
        reason: typeof result.reason === "string" ? result.reason : undefined,
      };
    });
  }

  async changes(
    sinceLsn?: number,
    opts: { collection?: string; limit?: number } = {}
  ): Promise<ChangeEvent[]> {
    const qs = new URLSearchParams();
    if (sinceLsn !== undefined) qs.set("since_lsn", String(sinceLsn));
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    const r = await this.json<{ events: ChangeEvent[] }>("/changes" + suffix);
    const events = r.events ?? [];
    return opts.collection
      ? events.filter((e) => e.collection === opts.collection)
      : events;
  }

  // Convenience: turn a /query response into plain row objects.
  async rows(query: string): Promise<Array<Record<string, unknown>>> {
    const r = await this.query(query);
    return r.result.records.map((rec) => rec.values);
  }
}
