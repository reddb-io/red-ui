// Normalised view of reddb's `/cluster/status` and `/replication/status`
// payloads, plus the topology classification the UI hangs per-mode telemetry
// off of.
//
// Shapes are pinned against the reddb source of truth — do NOT infer them
// from older UI code, which predates the #738 cluster-status contract:
//   - cluster/status: crates/reddb-server/src/presentation/cluster_status_json.rs
//   - replication/status: crates/reddb-server/src/server/handlers_replication.rs
//
// Honesty contract (#738): any field reddb cannot measure in the current
// build is serialised as an `{ "available": false, "reason": "<token>" }`
// envelope rather than a fabricated default. `Measurable<T>` models that — a
// field is either its natural value or that envelope.

/** Server's honest "cannot measure this" envelope (#738). */
export interface Unavailable {
  available: false;
  reason: string;
}

/** A value the server may or may not be able to measure in this build. */
export type Measurable<T> = T | Unavailable;

export function isUnavailable(value: unknown): value is Unavailable {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { available?: unknown }).available === false
  );
}

/** The measured value, or `undefined` when the server marked it unavailable. */
export function measured<T>(
  value: Measurable<T> | null | undefined
): T | undefined {
  if (value === null || value === undefined || isUnavailable(value))
    return undefined;
  return value;
}

/** The stable reason token when a field is unavailable, else `undefined`. */
export function reasonOf(value: unknown): string | undefined {
  return isUnavailable(value) ? value.reason : undefined;
}

export type DeploymentShape = "embedded" | "file" | "server" | "serverless";
export type ProcessRole = "standalone" | "primary" | "replica";
/** Lifecycle phase, `crates/reddb-server/src/runtime/lifecycle.rs`. */
export type LifecyclePhase =
  | "starting"
  | "ready"
  | "draining"
  | "shutting_down"
  | "stopped";

export interface TransportListener {
  transport: string;
  bind_addr: string;
  explicit: boolean;
  reason?: string;
}

export interface ClusterStatusReplica {
  id: string;
  last_acked_lsn: number;
  last_sent_lsn: number;
  last_durable_lsn: number;
  last_seen_at_unix_ms: number;
  /** primary head LSN − this replica's last ack. */
  lag_records: number;
  region: string | null;
}

/** Real `/cluster/status` envelope (#738). */
export interface ClusterStatus {
  snapshot_at_unix_ms?: number;
  version?: string;
  phase?: LifecyclePhase | string;
  uptime_secs?: number;
  started_at_unix_ms?: number;
  /** Present once the process reached `ready`. */
  ready_at_unix_ms?: number;
  read_only?: boolean;
  deployment?: {
    shape?: Measurable<DeploymentShape>;
    process_role?: Measurable<ProcessRole>;
    container?: Measurable<Record<string, unknown>>;
  };
  transports?: {
    active?: TransportListener[];
    failed?: TransportListener[];
  };
  connections?: {
    active: number;
    idle: number;
    total_checkouts: number;
    max: Measurable<number>;
  };
  storage?: {
    db_size_bytes?: Measurable<number>;
    remote_backend?: string | null;
    paged_mode?: boolean;
    encryption_at_rest?: { state: string; error?: string };
  };
  wal?: {
    current_lsn: number;
    last_archived_lsn: number;
    archive_lag_records: number;
    bytes: Measurable<number>;
  };
  system?: {
    pid: number;
    cpu_cores: number;
    os: string;
    arch: string;
    hostname: string;
    total_memory_bytes?: Measurable<number>;
    available_memory_bytes?: Measurable<number>;
    cpu_usage?: Measurable<number>;
    ram_usage?: Measurable<number>;
  };
  throughput?: Measurable<{
    requests_per_second?: number;
    reads_per_second?: number;
    writes_per_second?: number;
  }>;
  latency?: Measurable<{ avg_response_ms?: number }>;
  last_error?: Measurable<{ message?: string; at_unix_ms?: number }>;
  replication?: {
    role?: Measurable<ProcessRole>;
    commit_policy?: string;
    replica_count?: number;
    replicas?: ClusterStatusReplica[];
    apply_health?: Measurable<string>;
    degraded?: Measurable<boolean>;
    apply_errors?: Record<string, number>;
  };
  /** Defensive: older servers may still wrap responses in `{ ok }`. */
  ok?: boolean;
}

/** Per-replica view from a primary's `/replication/status`. */
export interface ReplicationReplica {
  id: string;
  last_acked_lsn: number;
  last_sent_lsn: number;
  /** primary head − this replica's ack (record distance). */
  lag_lsn: number;
  /** wall-clock seconds since the primary last heard from the replica. */
  lag_seconds: number;
  rebootstrapping: boolean;
}

export interface ReplicationSlot {
  id: string;
  restart_lsn: number;
  confirmed_lsn: number;
  invalidated: boolean;
  invalidation_reason?: string;
}

/** Real `/replication/status` envelope, primary + replica perspectives. */
export interface ReplicationStatus {
  ok: boolean;
  role: ProcessRole;
  current_term?: number;
  is_leader?: boolean;
  leader?: string;
  state?:
    | "idle"
    | "connecting"
    | "healthy"
    | "lagging"
    | "disconnected"
    | string;
  // primary perspective
  wal_lsn?: number;
  commit_watermark?: number;
  oldest_lsn?: number;
  replica_count?: number;
  replicas?: ReplicationReplica[];
  full_resync_count?: number;
  partial_resync_count?: number;
  replication_lag_lsn?: number;
  safe_replay_lsn?: number;
  retention_floor_lsn?: number;
  slots?: ReplicationSlot[];
  // replica perspective
  primary_addr?: string;
  last_applied_lsn?: number;
  last_seen_primary_lsn?: number;
  last_seen_oldest_lsn?: number;
  last_error?: string;
}

/**
 * The four user-facing topologies, plus `server` (a single networked node that
 * is neither serverless nor part of a replication set) and `unknown`. Derived
 * from the orthogonal axes the server exposes: deployment *shape* (where it
 * runs) × process *role* (its replication relationship).
 */
export type NodeTopology =
  | "embedded"
  | "serverless"
  | "replicated"
  | "server"
  | "unknown";

/**
 * Classify a node's topology. Role wins over shape: a node in a replication
 * relationship is `replicated` regardless of where it runs. Falls back to the
 * preset's configured role when the server exposes neither (older builds).
 */
export function topologyOf(
  cluster?: ClusterStatus,
  replication?: ReplicationStatus,
  presetRole?: string
): NodeTopology {
  const role =
    measured(cluster?.deployment?.process_role) ??
    measured(cluster?.replication?.role) ??
    replication?.role;
  if (role === "primary" || role === "replica") return "replicated";

  const shape = measured(cluster?.deployment?.shape);
  if (shape === "serverless") return "serverless";
  if (shape === "embedded" || shape === "file") return "embedded";
  if (shape === "server") return "server";

  // Server exposed nothing usable — lean on how the preset was configured.
  if (presetRole === "primary" || presetRole === "replica") return "replicated";
  if (presetRole === "embedded") return "embedded";
  if (presetRole === "standalone" || presetRole === "server") return "server";
  return "unknown";
}

/**
 * Cold-start duration in ms for a freshly-booted node: `ready_at - started_at`.
 * `null` when either timestamp is missing (e.g. not yet ready). This is the
 * serverless hero metric the user asked for — boot time.
 */
export function bootDurationMs(cluster?: ClusterStatus): number | null {
  const started = cluster?.started_at_unix_ms;
  const ready = cluster?.ready_at_unix_ms;
  if (started === undefined || ready === undefined) return null;
  const delta = ready - started;
  return delta >= 0 ? delta : null;
}

/**
 * Worst wall-clock replication lag across replicas, in seconds, from a
 * primary's `/replication/status`. `null` when no replicas are observed or the
 * field is absent. This answers "how long is replication taking".
 */
export function maxReplicaLagSeconds(
  replication?: ReplicationStatus
): number | null {
  const replicas = replication?.replicas;
  if (!replicas || replicas.length === 0) return null;
  let worst = 0;
  let seen = false;
  for (const r of replicas) {
    if (typeof r.lag_seconds === "number" && Number.isFinite(r.lag_seconds)) {
      worst = Math.max(worst, r.lag_seconds);
      seen = true;
    }
  }
  return seen ? worst : null;
}

/** One unavailable field the server explicitly declined to measure. */
export interface UnavailableField {
  /** Dotted path into the payload, e.g. `system.cpu_usage`. */
  path: string;
  reason: string;
}

/**
 * Walk the cluster-status payload and collect every field the server marked
 * `{ available: false }`, with its reason. This replaces the UI's previously
 * hand-maintained "not exposed" list — the server is now the source of truth
 * for what it cannot measure and why (#738).
 */
export function unavailableFields(cluster?: ClusterStatus): UnavailableField[] {
  if (!cluster) return [];
  const out: UnavailableField[] = [];
  const walk = (value: unknown, path: string, depth: number) => {
    if (isUnavailable(value)) {
      out.push({ path, reason: value.reason });
      return;
    }
    if (
      depth >= 4 ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      walk(child, path ? `${path}.${key}` : key, depth + 1);
    }
  };
  walk(cluster, "", 0);
  return out;
}
