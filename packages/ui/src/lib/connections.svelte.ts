// Live connections store. Delegates list/connect/whoami to a LocalUrlProvider
// from #reddb (the deep-module seam) and layers reactive Svelte
// state on top: which connection is active, its live probe (stats +
// replication), and a connected flag that gates the Connect screen.
//
// History format (per #5 EncryptedStore wiring):
//   - Plain localStorage holds only public-facing fields (id, label,
//     last_used, rtt_ms). Renders before unlock.
//   - The full URL (which may carry credentials) lives in the encrypted
//     store under `history:<id>`. Hydrated into the reactive list once
//     `secureStore.store` becomes non-null.

import {
  LocalUrlProvider,
  RedClient,
  type Connection,
  type ConnectionProvider,
  type HistoryEntry as ProtocolHistoryEntry,
  type HistoryStore,
  type ReplicationStatus,
  type Stats,
} from '#reddb'
import { secureStore } from './secureStore.svelte'
import { activity } from './activity.svelte'

export type ConnectionPreset = Connection & { description: string }

export const PRESETS: ConnectionPreset[] = [
  { id: 'embedded',        label: 'Embedded',       url: 'http://localhost:5055',  role: 'embedded', description: 'Local file via ./scripts/embedded.sh.' },
  { id: 'docker-primary',  label: 'Docker primary', url: 'http://localhost:15055', role: 'primary',  description: 'Docker compose primary (./docker/compose.yml).' },
  { id: 'docker-replica',  label: 'Docker replica', url: 'http://localhost:25055', role: 'replica',  description: 'Read-only mirror of docker primary.' },
]

interface ProbeResult {
  reachable: boolean
  rtt_ms?: number
  stats?: Stats
  replication?: ReplicationStatus
  error?: string
}

const STORAGE_KEY = 'red-ui:connection'
const HISTORY_KEY = 'red-ui:history'
const URL_PREFIX = 'history:'

export interface HistoryEntry {
  id: string
  label: string
  last_used: number
  rtt_ms?: number
  /** Hydrated from the encrypted store post-unlock. Undefined while locked. */
  url?: string
}

interface StoredLabelEntry {
  id: string
  label: string
  last_used: number
  rtt_ms?: number
}

function loadStored(): ConnectionPreset | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConnectionPreset
    if (parsed?.url && parsed?.label) return parsed
    return null
  } catch {
    return null
  }
}

function persist(c: ConnectionPreset) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch {}
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function readLabels(): StoredLabelEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<StoredLabelEntry & { url?: string }>
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e) => e && typeof e.id === 'string' && typeof e.label === 'string')
      .map((e) => ({ id: e.id, label: e.label, last_used: e.last_used, rtt_ms: e.rtt_ms }))
  } catch {
    return []
  }
}

function writeLabels(entries: StoredLabelEntry[]) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)) } catch {}
}

/**
 * HistoryStore implementation that splits storage:
 *   - Labels (id, label, last_used, rtt_ms) live in plain localStorage so
 *     the dropdown can render them before the user unlocks credentials.
 *   - URLs (which may carry user:pass) live in the encrypted store at
 *     `history:<id>`. They land in `urlById` once hydrated (post-unlock on
 *     web; at boot on Tauri).
 */
class EncryptedHistoryStore implements HistoryStore {
  /** Stable id ↔ url, both directions. Populated by save() and hydrate(). */
  private idByUrl = new Map<string, string>()
  private urlById = new Map<string, string>()
  private onChange?: () => void

  setOnChange(fn: () => void) { this.onChange = fn }

  load(): ProtocolHistoryEntry[] {
    const labels = readLabels()
    return labels.map((l) => ({
      url: this.urlById.get(l.id) ?? '',
      label: l.label,
      last_used: l.last_used,
      rtt_ms: l.rtt_ms,
    }))
  }

  save(entries: ProtocolHistoryEntry[]) {
    const next: StoredLabelEntry[] = []
    const seenUrls = new Set<string>()
    for (const e of entries) {
      if (!e.url || seenUrls.has(e.url)) continue
      seenUrls.add(e.url)
      let id = this.idByUrl.get(e.url)
      if (!id) {
        id = genId()
        this.idByUrl.set(e.url, id)
      }
      this.urlById.set(id, e.url)
      next.push({ id, label: e.label, last_used: e.last_used, rtt_ms: e.rtt_ms })
    }
    writeLabels(next)
    const store = secureStore.store
    if (store) {
      for (const row of next) {
        const url = this.urlById.get(row.id)
        if (url) store.put(URL_PREFIX + row.id, url).catch(() => {})
      }
    }
    this.onChange?.()
  }

  /** Snapshot suitable for the reactive UI list. */
  uiEntries(): HistoryEntry[] {
    return readLabels().map((l) => ({
      id: l.id,
      label: l.label,
      last_used: l.last_used,
      rtt_ms: l.rtt_ms,
      url: this.urlById.get(l.id),
    }))
  }

  /** Read URLs from secure store for entries we don't yet know. */
  async hydrate() {
    const store = secureStore.store
    if (!store) return
    const labels = readLabels()
    let changed = false
    for (const l of labels) {
      if (this.urlById.has(l.id)) continue
      try {
        const url = await store.get(URL_PREFIX + l.id)
        if (url) {
          this.urlById.set(l.id, url)
          this.idByUrl.set(url, l.id)
          changed = true
        }
      } catch { /* tampered or wrong key — surface as missing URL */ }
    }
    if (changed) this.onChange?.()
  }

  async forgetById(id: string) {
    const labels = readLabels().filter((l) => l.id !== id)
    writeLabels(labels)
    const url = this.urlById.get(id)
    if (url) {
      this.urlById.delete(id)
      this.idByUrl.delete(url)
    }
    const store = secureStore.store
    if (store) {
      try { await store.delete(URL_PREFIX + id) } catch {}
    }
    this.onChange?.()
  }

  async forgetByUrl(url: string) {
    const id = this.idByUrl.get(url)
    if (id) {
      await this.forgetById(id)
      return
    }
    // Pre-hydration: best-effort match on the plain labels (no URL to compare).
    // Fall through — caller can use forgetById from the dropdown's `id`.
  }
}

const historyStore = new EncryptedHistoryStore()

/**
 * Normalize a user-typed connection string to a URL the browser can speak
 * (always http/https against the HTTP API port 5055).
 *
 * red://host[:port][/path]   → http://host:5055
 * reds://host[:port][/path]  → https://host:5055
 * http(s)://...               → unchanged
 * host[:port]                 → http://host:port|5055
 */
export function normalizeUrl(input: string): string {
  let raw = input.trim().replace(/\/$/, '')
  if (!raw) return raw

  if (!/:\/\//.test(raw)) raw = 'http://' + raw

  const m = raw.match(/^([a-z+]+):\/\/(.+)$/i)
  if (!m) return raw
  const [, scheme, rest] = m
  const s = scheme.toLowerCase()

  if (s === 'red' || s === 'red+tcp' || s === 'red+wire') {
    const [host] = rest.split('/')[0].split(':')
    return `http://${host}:5055${rest.includes('/') ? '/' + rest.split('/').slice(1).join('/') : ''}`
  }
  if (s === 'reds' || s === 'red+tls') {
    const [host] = rest.split('/')[0].split(':')
    return `https://${host}:5055`
  }
  return raw
}

export function makeCustomConnection(input: string): ConnectionPreset {
  const url = normalizeUrl(input)
  let host = url
  try { host = new URL(url).host } catch {}
  return {
    id: url,
    label: host || url,
    url,
    role: 'primary',
    description: 'User-provided connection string.',
  }
}

const CONNECTION_QUERY_KEYS = ['connection', 'red_url', 'red']

function loadLocationConnection(): ConnectionPreset | null {
  if (typeof location === 'undefined') return null
  const params = new URLSearchParams(location.search)
  for (const key of CONNECTION_QUERY_KEYS) {
    const input = params.get(key)
    if (input) return makeCustomConnection(input)
  }
  return null
}

// Shared provider — one per browser tab. History is split: labels in plain
// localStorage so the dropdown renders pre-unlock; URLs encrypted at rest.
export const provider: ConnectionProvider & {
  forget(url: string): void
} = new LocalUrlProvider({
  presets: PRESETS,
  history: historyStore,
})

class ConnectionStore {
  /** Set after a probe succeeds for the first time — used to gate the Connect screen. */
  connected = $state<boolean>(false)
  active = $state<ConnectionPreset>(loadLocationConnection() ?? loadStored() ?? PRESETS[1])
  probe = $state<ProbeResult>({ reachable: false })
  history = $state<HistoryEntry[]>([])

  constructor() {
    this.history = historyStore.uiEntries()
    historyStore.setOnChange(() => { this.history = historyStore.uiEntries() })
  }

  get client(): RedClient | null {
    return this.active.url ? new RedClient(this.active.url) : null
  }

  async forget(url: string) {
    await historyStore.forgetByUrl(url)
  }

  async forgetById(id: string) {
    await historyStore.forgetById(id)
  }

  /** Called from +layout once secureStore.store binds. */
  async hydrateUrls() {
    await historyStore.hydrate()
  }

  async switch(preset: ConnectionPreset) {
    this.active = preset
    persist(preset)
    await this.refresh()
  }

  async tryConnect(preset: ConnectionPreset): Promise<boolean> {
    try {
      const active = await activity.track(
        `connect · ${preset.label}`,
        () => provider.connect(preset.id),
      )
      this.active = { ...preset, ...active.connection, description: preset.description }
      persist(this.active)
      const [stats, replication] = await Promise.all([
        activity.track(`connect · ${preset.label} stats`, () => active.client.stats()).catch(() => undefined),
        activity.track(`connect · ${preset.label} replication`, () => active.client.replication()).catch(() => undefined),
      ])
      this.probe = { reachable: true, rtt_ms: active.rtt_ms, stats, replication }
      this.connected = true
      return true
    } catch (e) {
      this.probe = { reachable: false, error: (e as Error).message }
      return false
    }
  }

  async refresh() {
    const client = this.client
    if (!client) {
      this.probe = { reachable: false }
      return
    }
    try {
      const ping = await activity.track(`heartbeat · ${this.active.label}`, () => client.ping())
      if (!ping.ok) {
        this.probe = { reachable: false, error: ping.error }
        return
      }
      const [stats, replication] = await Promise.all([
        activity.track(`heartbeat · stats`, () => client.stats()).catch(() => undefined),
        activity.track(`heartbeat · replication`, () => client.replication()).catch(() => undefined),
      ])
      this.probe = { reachable: true, rtt_ms: ping.rtt_ms, stats, replication }
      this.connected = true
    } catch (e) {
      this.probe = { reachable: false, error: (e as Error).message }
    }
  }

  disconnect() {
    this.connected = false
    this.probe = { reachable: false }
  }
}

export const connection = new ConnectionStore()
