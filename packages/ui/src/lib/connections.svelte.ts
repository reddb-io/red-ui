// Live connections store. Persists the last working connection to
// localStorage so the next visit skips the connect screen when the
// remembered target is still reachable.

import { RedClient, type Stats, type ReplicationStatus } from '@red-ui/protocol'

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

export interface HistoryEntry {
  url: string
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

function loadHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistHistory(entries: HistoryEntry[]) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)) } catch {}
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

  private record(preset: ConnectionPreset, rtt_ms?: number) {
    const entry: HistoryEntry = {
      url: preset.url,
      label: preset.label,
      last_used: Date.now(),
      rtt_ms,
    }
    const filtered = this.history.filter((e) => e.url !== preset.url)
    this.history = [entry, ...filtered].slice(0, HISTORY_MAX)
    persistHistory(this.history)
  }

  forget(url: string) {
    this.history = this.history.filter((e) => e.url !== url)
    persistHistory(this.history)
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
    this.record(preset, ping.rtt_ms)
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
