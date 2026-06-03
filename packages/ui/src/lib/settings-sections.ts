// Data-driven settings registry + a pure config-key resolver.
//
// Settings are defined as DATA, not hand-built rows: `SECTIONS` lists the
// curated config keys per section, and three override maps (`LABELS`,
// `DESCRIPTIONS`, `ENUM_OPTIONS`) keyed by config path supply the human copy.
// `resolveControl(key, value)` maps a single reddb config/connection key to a
// rendered control descriptor (human label, description, input kind, enum
// options), degrading gracefully for keys nobody curated. Adding a curated key
// is a one-line edit to a section's `keys` array.
//
// Kept framework-free (no Svelte imports) so the registry and the resolver are
// trivially unit-testable. Icons are mapped to components in `SettingsView`,
// not here — a section carries only an icon *name*. Mirrors the registry idiom
// in `renderers/registry`: a tiny pure surface over curated data.

/** The input control a config value is rendered through. */
export type ControlKind = "text" | "number" | "boolean" | "enum";

/** Where a config key is sourced from — gates permission-aware rendering. */
export type SettingsSource = "stats" | "cluster" | "capabilities" | "session";

/** A resolved control for one config key. */
export interface ControlDescriptor {
  /** The config path this descriptor was resolved from. */
  key: string;
  /** Human label — a curated override or a humanized key. */
  label: string;
  /** Optional one-line explanation. */
  description?: string;
  /** Input kind inferred from the curated enum map or the value's type. */
  kind: ControlKind;
  /** Allowed values when `kind === "enum"`. */
  options?: readonly string[];
}

export interface SettingsSection {
  /** Stable identifier used as the active-section key (component state only). */
  id: string;
  /** Nav label. */
  label: string;
  /** One-line description shown under the section title. */
  blurb: string;
  /** Icon name resolved to a lucide component in `SettingsView`. */
  icon: string;
  /** Curated config keys, rendered top-to-bottom. One-line edit to extend. */
  keys: string[];
}

/**
 * The curated sections. Each `keys` entry is a flattened reddb config path
 * (see `flattenConfig`) sourced from `/stats`, `/cluster/status`,
 * `/capabilities`, or the session (`whoami`). Order is the render order.
 */
export const SECTIONS: SettingsSection[] = [
  {
    id: "overview",
    label: "Overview",
    blurb: "What this reddb instance is and where it runs.",
    icon: "settings",
    keys: [
      "deployment.mode",
      "read_only",
      "system.os",
      "system.arch",
      "system.hostname",
      "system.cpu_cores",
    ],
  },
  {
    id: "storage",
    label: "Storage",
    blurb: "Live store footprint for the active connection.",
    icon: "database",
    keys: [
      "store.collection_count",
      "store.total_entities",
      "store.cross_ref_count",
      "store.total_memory_bytes",
    ],
  },
  {
    id: "cluster",
    label: "Cluster",
    blurb: "Deployment and replication topology.",
    icon: "network",
    keys: [
      "deployment.mode",
      "deployment.file_path",
      "replication.replica_count",
      "replication.lag_ms",
    ],
  },
  {
    id: "capabilities",
    label: "Capabilities",
    blurb: "Endpoints negotiated for this server version.",
    icon: "plug",
    keys: [
      "capabilities.vcs",
      "capabilities.clusterStatus",
      "capabilities.collectionMetadata",
      "capabilities.cdcStream",
    ],
  },
  {
    id: "session",
    label: "Session",
    blurb: "Who red-ui is authenticated as on this connection.",
    icon: "shield",
    keys: ["session.username", "session.role", "session.authenticated"],
  },
];

/** Curated label overrides, keyed by config path. */
export const LABELS: Record<string, string> = {
  "deployment.mode": "Deployment mode",
  "deployment.file_path": "Backing file",
  read_only: "Read-only",
  "system.os": "Operating system",
  "system.arch": "Architecture",
  "system.hostname": "Hostname",
  "system.cpu_cores": "CPU cores",
  "store.collection_count": "Collections",
  "store.total_entities": "Entities",
  "store.cross_ref_count": "Cross-references",
  "store.total_memory_bytes": "Memory in use",
  "replication.replica_count": "Replicas",
  "replication.lag_ms": "Replication lag",
  "capabilities.vcs": "Version control",
  "capabilities.clusterStatus": "Cluster status",
  "capabilities.collectionMetadata": "Collection metadata",
  "capabilities.cdcStream": "Change stream",
  "session.username": "Username",
  "session.role": "Role",
  "session.authenticated": "Authenticated",
};

/** Curated descriptions, keyed by config path. */
export const DESCRIPTIONS: Record<string, string> = {
  "deployment.mode": "How this reddb instance is running.",
  "deployment.file_path": "On-disk store path for an embedded or local server.",
  read_only: "Whether the store rejects writes (a lock or a replica role).",
  "store.total_memory_bytes": "Resident memory the store currently holds.",
  "replication.lag_ms": "How far this replica trails the primary, in ms.",
  "capabilities.vcs": "Commit and diff endpoints — gated when unsupported.",
  "capabilities.cdcStream": "Server-sent change stream over /changes/stream.",
  "session.role": "The role granted to this principal on the active target.",
};

/** Curated enum options, keyed by config path. Presence ⇒ `kind: "enum"`. */
export const ENUM_OPTIONS: Record<string, readonly string[]> = {
  "deployment.mode": ["embedded", "server", "docker", "replicated"],
};

/**
 * Turn a config path into a human label when nobody curated one:
 * `store.total_memory_bytes` → "Total memory bytes". Uses the last path
 * segment, swaps `_`/`-` for spaces, and sentence-cases the result.
 */
export function humanizeKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  const words = last.replace(/[_-]+/g, " ").trim();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Resolve a config key (and its live value) to a rendered control descriptor.
 *
 * Resolution order, each degrading gracefully:
 *  - label: `LABELS[key]` → `humanizeKey(key)`
 *  - description: `DESCRIPTIONS[key]` → omitted
 *  - kind: `ENUM_OPTIONS[key]` ⇒ `"enum"`; else inferred from the value's
 *    runtime type (boolean / number) → `"text"` for everything else, including
 *    `undefined`. So an unknown key with no value still yields a valid `"text"`
 *    descriptor rather than throwing.
 */
export function resolveControl(
  key: string,
  value?: unknown
): ControlDescriptor {
  const options = ENUM_OPTIONS[key];
  const kind: ControlKind = options
    ? "enum"
    : typeof value === "boolean"
      ? "boolean"
      : typeof value === "number"
        ? "number"
        : "text";
  const descriptor: ControlDescriptor = {
    key,
    label: LABELS[key] ?? humanizeKey(key),
    kind,
  };
  const description = DESCRIPTIONS[key];
  if (description) descriptor.description = description;
  if (options) descriptor.options = options;
  return descriptor;
}

/** Which live source a config key is read from — drives permission-awareness. */
export function sourceForKey(key: string): SettingsSource {
  if (key.startsWith("capabilities.")) return "capabilities";
  if (key.startsWith("session.")) return "session";
  if (
    key.startsWith("deployment.") ||
    key.startsWith("storage.") ||
    key.startsWith("wal.") ||
    key.startsWith("throughput.") ||
    key.startsWith("replication.")
  ) {
    return "cluster";
  }
  return "stats";
}

/**
 * Flatten a nested config snapshot into dotted leaf paths. Nested plain objects
 * recurse (`{ store: { collection_count: 3 } }` → `"store.collection_count"`);
 * arrays and primitives are kept as leaf values. `undefined`/`null` branches
 * are skipped so a server that omits a sub-tree simply yields no keys for it.
 */
export function flattenConfig(
  input: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v === undefined || v === null) continue;
      if (typeof v === "object" && !Array.isArray(v)) {
        walk(v as Record<string, unknown>, key);
      } else {
        out[key] = v;
      }
    }
  };
  walk(input, "");
  return out;
}

/**
 * Resolve a section by id, falling back to the first section when the id is
 * unknown or null. The settings view drives the active section purely from
 * component state, so this never touches the URL.
 */
export function resolveSection(id: string | null): SettingsSection {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}
