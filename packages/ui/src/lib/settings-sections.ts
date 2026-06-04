// Data-driven settings registry + pure schema resolver for the Settings surface.
import type {
  ConfigEntry,
  ConfigValueType,
  SecretEntry,
  SecretReference,
} from "./settings-authoring-client";
import type { PermissionCheck } from "./permission-gate";

/** The read-only control a config value is rendered through. */
export type ControlKind =
  | "text"
  | "number"
  | "boolean"
  | "enum"
  | "list"
  | "secret-reference";

/** A resolved control for one config key. */
export interface ControlDescriptor {
  /** The config path this descriptor was resolved from. */
  key: string;
  /** Human label: a curated override or a humanized key. */
  label: string;
  /** Optional one-line explanation. */
  description?: string;
  /** Input kind inferred from the curated enum map or the value's type. */
  kind: ControlKind;
  /** Allowed values when `kind === "enum"`. */
  options?: readonly string[];
  /** Server-reported config schema type, when SHOW CONFIG projects it. */
  valueType?: ConfigValueType;
  /** Server-reported config schema version, when SHOW CONFIG projects it. */
  schemaVersion?: number;
  /** True when this row must not render plaintext. */
  masked?: boolean;
  /** Vault path referenced by a config value, if this is a secret reference. */
  secretReference?: SecretReference;
}

export interface SettingsPane {
  /** Stable identifier used as the active-pane key (component state only). */
  id: string;
  /** Nav label. */
  label: string;
  /** One-line description shown under the section title. */
  blurb: string;
  /** Icon name resolved to a lucide component in `SettingsView`. */
  icon: string;
  /** Pane-level grant that must be allowed before this pane is rendered. */
  readGrant: PermissionCheck;
}

export const SETTINGS_PANES: SettingsPane[] = [
  {
    id: "config",
    label: "Config",
    blurb: "Live non-secret configuration from SHOW CONFIG.",
    icon: "settings",
    readGrant: {
      action: "config:read",
      resource: { kind: "config", name: "*" },
    },
  },
  {
    id: "secrets",
    label: "Secrets",
    blurb: "Vault inventory from SHOW SECRETS with values masked.",
    icon: "key",
    readGrant: {
      action: "vault:read_metadata",
      resource: { kind: "vault", name: "*" },
    },
  },
];

/** Curated label overrides, keyed by config path. */
export const LABELS: Record<string, string> = {
  "durability.mode": "Durability mode",
  "concurrency.locking.enabled": "Locking",
  "cache.blob.l1_bytes_max": "Blob L1 cache",
  "cache.blob.l2_bytes_max": "Blob L2 cache",
  "red.auth.enabled": "Authentication",
  "red.auth.require_auth": "Require authentication",
  "red.auth.session_ttl_secs": "Session TTL",
  "red.backup.backend": "Backup backend",
  "red.backup.enabled": "Backups",
  "red.backup.interval_secs": "Backup interval",
  "red.cdc.enabled": "Change data capture",
  "red.config.secret.auto_decrypt": "Auto-decrypt config secrets",
  "red.config.secret.auto_encrypt": "Auto-encrypt config secrets",
  "red.server.max_body_size": "Max request body",
  "red.server.max_scan_limit": "Max scan limit",
  "red.server.read_timeout_ms": "Read timeout",
  "red.server.write_timeout_ms": "Write timeout",
  "red.storage.page_size": "Page size",
  "red.storage.page_cache_capacity": "Page cache capacity",
  "red.storage.verify_checksums": "Verify checksums",
  "red.system.os": "Operating system",
  "red.system.arch": "Architecture",
  "red.system.hostname": "Hostname",
  "red.system.cpu_cores": "CPU cores",
  "red.system.total_memory_bytes": "System memory",
  "red.vcs.default_branch": "Default branch",
  "red.vcs.protected_branches": "Protected branches",
  "runtime.result_cache.backend": "Result cache backend",
  "runtime.result_cache.enabled": "Result cache",
  "storage.bgwriter.delay_ms": "Background writer delay",
  "storage.btree.lehman_yao": "Lehman-Yao B-tree",
  "storage.wal.max_interval_ms": "WAL max interval",
  "system.bootstrap.completed": "Bootstrap completed",
  "system.bootstrap.preset": "Bootstrap preset",
};

/** Curated descriptions, keyed by config path. */
export const DESCRIPTIONS: Record<string, string> = {
  "durability.mode": "Write durability policy currently reported by reddb.",
  "red.auth.enabled":
    "Whether reddb authentication is enabled for this instance.",
  "red.auth.require_auth": "Whether unauthenticated requests are rejected.",
  "red.backup.backend": "The selected backup storage backend.",
  "red.backup.enabled": "Whether scheduled backups are enabled.",
  "red.cdc.enabled": "Whether the change stream subsystem is enabled.",
  "red.server.max_body_size":
    "Maximum accepted HTTP request body size, in bytes.",
  "red.server.max_scan_limit": "Default cap for scan-heavy API paths.",
  "red.storage.page_size": "On-disk page size used by the storage engine.",
  "red.storage.verify_checksums":
    "Whether page checksums are verified on read.",
  "red.vcs.default_branch":
    "Branch name used when VCS features need a default.",
  "red.vcs.protected_branches":
    "Branches protected from destructive operations.",
  "runtime.result_cache.enabled": "Whether query result caching is enabled.",
  "system.bootstrap.preset": "The bootstrap profile that initialized defaults.",
};

/** Curated enum options, keyed by config path. Presence ⇒ `kind: "enum"`. */
export const ENUM_OPTIONS: Record<string, readonly string[]> = {
  "durability.mode": ["sync", "async", "none"],
  "red.backup.backend": ["local", "s3", "gcs"],
  "runtime.result_cache.backend": ["legacy", "blob_cache"],
};

/**
 * Turn a config path into a human label when nobody curated one:
 * `store.total_memory_bytes` becomes "Total memory bytes". Uses the last path
 * segment, swaps `_`/`-` for spaces, and sentence-cases the result.
 */
export function humanizeKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  const words = last.replace(/[_-]+/g, " ").trim();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function kindFromValueType(
  valueType: ConfigValueType | undefined
): ControlKind | null {
  switch (valueType) {
    case "bool":
    case "boolean":
      return "boolean";
    case "int":
    case "integer":
    case "float":
    case "number":
    case "count":
      return "number";
    case "array":
    case "list":
      return "list";
    case "object":
    case "string":
    case "text":
    case "url":
      return "text";
    default:
      return null;
  }
}

function kindFromRuntimeValue(value: unknown): ControlKind {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "list";
  return "text";
}

export function isSecretReference(value: unknown): value is SecretReference {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as SecretReference).type === "secret_ref" &&
    typeof (value as SecretReference).key === "string"
  );
}

export function resolveConfigControl(entry: ConfigEntry): ControlDescriptor {
  const options = ENUM_OPTIONS[entry.key];
  const secretReference = isSecretReference(entry.value)
    ? entry.value
    : undefined;
  const kind: ControlKind = secretReference
    ? "secret-reference"
    : options
      ? "enum"
      : (kindFromValueType(entry.valueType) ??
        kindFromRuntimeValue(entry.value));
  const descriptor: ControlDescriptor = {
    key: entry.key,
    label: LABELS[entry.key] ?? humanizeKey(entry.key),
    kind,
  };
  const description = DESCRIPTIONS[entry.key];
  if (description) descriptor.description = description;
  if (options) descriptor.options = options;
  if (entry.valueType) descriptor.valueType = entry.valueType;
  if (entry.schemaVersion !== undefined)
    descriptor.schemaVersion = entry.schemaVersion;
  if (secretReference) descriptor.secretReference = secretReference;
  return descriptor;
}

export function resolveSecretControl(entry: SecretEntry): ControlDescriptor {
  return {
    key: entry.key,
    label: humanizeKey(entry.key),
    kind: "text",
    masked: true,
  };
}

export function resolvePane(
  id: string | null,
  panes: readonly SettingsPane[] = SETTINGS_PANES
): SettingsPane {
  return panes.find((pane) => pane.id === id) ?? panes[0] ?? SETTINGS_PANES[0];
}

export function filterSettingsPanesByGrant(
  panes: readonly SettingsPane[],
  gate: { cachedCan(check: PermissionCheck): boolean }
): SettingsPane[] {
  return panes.filter((pane) => gate.cachedCan(pane.readGrant));
}

export function filterConfigEntries(
  entries: readonly ConfigEntry[],
  query: string
): ConfigEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter(
    (entry) =>
      entry.key.toLowerCase().includes(q) ||
      resolveConfigControl(entry).label.toLowerCase().includes(q) ||
      (isSecretReference(entry.value) &&
        entry.value.key.toLowerCase().includes(q))
  );
}

export function filterSecretEntries(
  entries: readonly SecretEntry[],
  query: string
): SecretEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter(
    (entry) =>
      entry.key.toLowerCase().includes(q) ||
      resolveSecretControl(entry).label.toLowerCase().includes(q) ||
      entry.status?.toLowerCase().includes(q)
  );
}
