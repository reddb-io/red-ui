// Live connections store. Persists the last working connection to
// localStorage so the next visit skips the connect screen when the
// remembered target is still reachable.
//
// History format (per #5 EncryptedStore wiring):
//   - Plain localStorage holds only public-facing fields (id, label,
//     last_used, rtt_ms). Renders before unlock.
//   - The full URL (which may carry credentials) lives in the encrypted
//     store under `history:<id>`. Hydrated into the reactive list once
//     `secureStore.store` becomes non-null.

import { RedClient, type Stats, type ReplicationStatus } from '@red-ui/protocol'
import { secureStore } from './secureStore.svelte'

export interface ConnectionPreset {
  id: string
  label: string
  url: string
  role: 'primary' | 'replica' | 'embedded'
  description: string
}

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
const HISTORY_MAX = 8
const URL_PREFIX = 'history:'

export interface HistoryEntry {
  id: string
  label: string
  last_used: number
  rtt_ms?: number
  /** Hydrated from the encrypted store post-unlock. Undefined while locked. */
  url?: string
}

interface StoredHistoryEntry {
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

function loadHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<StoredHistoryEntry & { url?: string }>
    if (!Array.isArray(parsed)) return []
    // Strip any URL field that may have been written by a pre-encryption
    // version of the app; we never want to read it back from plain storage.
    return parsed
      .filter((e) => e && typeof e.id === 'string' && typeof e.label === 'string')
      .map((e) => ({ id: e.id, label: e.label, last_used: e.last_used, rtt_ms: e.rtt_ms }))
  } catch {
    return []
  }
}

function persistHistory(entries: HistoryEntry[]) {
  if (typeof localStorage === 'undefined') return
  try {
    const stripped: StoredHistoryEntry[] = entries.map((e) => ({
      id: e.id, label: e.label, last_used: e.last_used, rtt_ms: e.rtt_ms,
    }))
    localStorage.setItem(HISTORY_KEY, JSON.stringify(stripped))
  } catch {}
}

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

  // Bare host like "localhost" or "10.0.0.5:9000"
  if (!/:\/\//.test(raw)) raw = 'http://' + raw

  const m = raw.match(/^([a-z+]+):\/\/(.+)$/i)
  if (!m) return raw
  const [, scheme, rest] = m
  const s = scheme.toLowerCase()

  // Translate native reddb schemes to HTTP API
  if (s === 'red' || s === 'red+tcp' || s === 'red+wire') {
    const [host, _port] = rest.split('/')[0].split(':')
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
    id: 'custom',
    label: host || url,
    url,
    role: 'primary',
    description: 'User-provided connection string.',
  }
}

class ConnectionStore {
  /** Set after a probe succeeds for the first time — used to gate the Connect screen. */
  connected = $state<boolean>(false)
  active = $state<ConnectionPreset>(loadStored() ?? PRESETS[1])
  probe = $state<ProbeResult>({ reachable: false })
  history = $state<HistoryEntry[]>(loadHistory())

  get client(): RedClient | null {
    return this.active.url ? new RedClient(this.active.url) : null
  }

  private async record(preset: ConnectionPreset, rtt_ms?: number) {
    // Dedupe by url when we have the URL on neighbouring entries (post-unlock),
    // otherwise fall back to label matching.
    const dedupe = (e: HistoryEntry) =>
      (e.url && e.url === preset.url) || (!e.url && e.label === preset.label)
    const existing = this.history.find(dedupe)
    const id = existing?.id ?? genId()
    const entry: HistoryEntry = { id, url: preset.url, label: preset.label, last_used: Date.now(), rtt_ms }
    const filtered = this.history.filter((e) => !dedupe(e))
    this.history = [entry, ...filtered].slice(0, HISTORY_MAX)
    persistHistory(this.history)
    if (secureStore.store) {
      try { await secureStore.store.put(URL_PREFIX + id, preset.url) } catch {}
    }
  }

  /**
   * Read every URL we have an envelope for, populate `entry.url` in the
   * reactive list. Called once `secureStore.store` flips from null to bound.
   */
  async hydrateUrls() {
    const s = secureStore.store
    if (!s) return
    const next: HistoryEntry[] = []
    for (const e of this.history) {
      if (e.url) { next.push(e); continue }
      try {
        const url = await s.get(URL_PREFIX + e.id)
        next.push(url ? { ...e, url } : e)
      } catch {
        next.push(e)
      }
    }
    this.history = next
  }

  async forget(url: string) {
    const dropped = this.history.find((e) => e.url === url)
    this.history = this.history.filter((e) => e.url !== url)
    persistHistory(this.history)
    if (dropped && secureStore.store) {
      try { await secureStore.store.delete(URL_PREFIX + dropped.id) } catch {}
    }
  }

  /** Forget a history entry by id (works pre-unlock — no URL needed). */
  async forgetById(id: string) {
    this.history = this.history.filter((e) => e.id !== id)
    persistHistory(this.history)
    if (secureStore.store) {
      try { await secureStore.store.delete(URL_PREFIX + id) } catch {}
    }
  }

  async switch(preset: ConnectionPreset) {
    this.active = preset
    persist(preset)
    await this.refresh()
  }

  async tryConnect(preset: ConnectionPreset): Promise<boolean> {
    const client = new RedClient(preset.url)
    const ping = await client.ping()
    if (!ping.ok) {
      this.probe = { reachable: false, error: ping.error }
      return false
    }
    this.active = preset
    persist(preset)
    const [stats, replication] = await Promise.all([
      client.stats().catch(() => undefined),
      client.replication().catch(() => undefined),
    ])
    this.probe = { reachable: true, rtt_ms: ping.rtt_ms, stats, replication }
    this.connected = true
    await this.record(preset, ping.rtt_ms)
    return true
  }

  async refresh() {
    const client = this.client
    if (!client) {
      this.probe = { reachable: false }
      return
    }
    try {
      const ping = await client.ping()
      if (!ping.ok) {
        this.probe = { reachable: false, error: ping.error }
        return
      }
      const [stats, replication] = await Promise.all([
        client.stats().catch(() => undefined),
        client.replication().catch(() => undefined),
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
