// Server-version capability negotiation (#22). One UI build talks to many
// reddb server versions: rather than assume every endpoint exists, the UI
// resolves a capability map for the active connection and HIDES controls the
// server can't honour (absent, not greyed — the permission-aware rule).
//
// Resolution prefers a STABLE server signal (`GET /capabilities`) over
// inferring from 404s, and FAILS SAFE — any uncertainty resolves to "not
// supported" so a newer UI never assumes a capability a server lacks.

/** The feature flags the UI gates controls on. Extend as features are added. */
export interface ServerCapabilities {
  /** Version control (commits / diffs) — `/repo/commits`, `/collections/:n/vcs`. */
  vcs: boolean
  /** Cluster topology + status — `/cluster/status`. */
  clusterStatus: boolean
  /** Per-collection metadata route — `GET /collections/:name`. */
  collectionMetadata: boolean
  /** Server-sent change stream — `/changes/stream`. */
  cdcStream: boolean
}

/** Fail-safe baseline: nothing is assumed present until proven. */
export const EMPTY_SERVER_CAPABILITIES: ServerCapabilities = Object.freeze({
  vcs: false,
  clusterStatus: false,
  collectionMetadata: false,
  cdcStream: false,
})

/** Shape of the optional stable `/capabilities` signal. */
export interface RawCapabilities {
  ok?: boolean
  /** Flat feature names, e.g. ["vcs","cluster_status"]. */
  features?: string[]
  /** Or an explicit flag map, e.g. { vcs: true }. */
  capabilities?: Record<string, boolean>
}

// Server feature names → our capability keys. Several aliases per key so we
// tolerate naming drift across server versions without a UI release.
const FEATURE_ALIASES: Record<string, keyof ServerCapabilities> = {
  vcs: 'vcs',
  versioning: 'vcs',
  version_control: 'vcs',
  cluster: 'clusterStatus',
  cluster_status: 'clusterStatus',
  collection_metadata: 'collectionMetadata',
  collections_metadata: 'collectionMetadata',
  cdc: 'cdcStream',
  changes_stream: 'cdcStream',
  cdc_stream: 'cdcStream',
}

/**
 * Build a capability map from the stable `/capabilities` signal. Unknown
 * feature names are ignored (a server advertising features this UI version
 * doesn't model is harmless); known ones flip their flag on. The explicit
 * `capabilities` map, when present, takes precedence over the `features` list.
 */
export function capabilitiesFromSignal(raw: RawCapabilities): ServerCapabilities {
  const out: ServerCapabilities = { ...EMPTY_SERVER_CAPABILITIES }
  for (const name of raw.features ?? []) {
    const key = FEATURE_ALIASES[name?.toLowerCase?.() ?? '']
    if (key) out[key] = true
  }
  for (const [name, on] of Object.entries(raw.capabilities ?? {})) {
    const key = FEATURE_ALIASES[name.toLowerCase()]
    if (key) out[key] = on === true
  }
  return out
}
