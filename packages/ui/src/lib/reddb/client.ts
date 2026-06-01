// Real HTTP client for a running reddb instance.
// Endpoints discovered from reddb/crates/reddb-server/src/server/routing.rs.

import {
  capabilitiesFromSignal,
  EMPTY_SERVER_CAPABILITIES,
  type RawCapabilities,
  type ServerCapabilities,
} from "./server-capabilities";

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
