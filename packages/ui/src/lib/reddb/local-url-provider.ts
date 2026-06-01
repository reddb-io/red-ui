// LocalUrlProvider — the OSS implementation of ConnectionProvider. Wraps
// a list of well-known presets and a recent-history backing store. The
// browser usage backs history with localStorage; tests inject an
// in-memory store via the options bag.

import { RedClient } from './client'
import {
  NotConnectedError,
  UnknownConnectionError,
  UnreachableConnectionError,
  type ActiveConnection,
  type Connection,
  type ConnectionProvider,
  type Identity,
} from './connection-provider'
import { BROWSER_TRANSPORTS } from './transports'
import type { Transport } from './types'
import { hasBootEndpoint, type BootParams } from './boot-params'

export interface HistoryEntry {
  url: string
  label: string
  last_used: number
  rtt_ms?: number
}

export interface HistoryStore {
  load(): HistoryEntry[]
  save(entries: HistoryEntry[]): void
}

export interface LocalUrlProviderOptions {
  /** Built-in connections, surfaced first in `list()`. */
  presets?: Connection[]
  /** Backing store for the recent-URL history. Defaults to in-memory. */
  history?: HistoryStore
  /** Hook for tests / Tauri to swap the HTTP client implementation. */
  clientFactory?: (url: string) => RedClient
  /** Max history entries retained. */
  historyMax?: number
  /**
   * Wire transports this Surface can reach (#34, ADR-0003). Defaults to the
   * browser-reachable set (http/https + coerced red://); a Tauri Surface passes
   * the desktop set so native unix/embedded connections are offered.
   */
  transports?: Transport[]
  /**
   * Non-secret boot config seeded by the Surface (#36, ADR-0005) — endpoint +
   * initial view from the app URL. Surfaced via `bootParams()` so the Core can
   * auto-connect without the Connect flow. Tokens must never be placed here.
   */
  bootParams?: BootParams
}

const HISTORY_MAX_DEFAULT = 8

function inMemoryStore(): HistoryStore {
  let entries: HistoryEntry[] = []
  return {
    load: () => entries.slice(),
    save: (next) => {
      entries = next.slice()
    },
  }
}

export function localStorageHistory(key: string): HistoryStore {
  return {
    load() {
      if (typeof localStorage === 'undefined') return []
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return []
        const parsed = JSON.parse(raw) as HistoryEntry[]
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    },
    save(entries) {
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(key, JSON.stringify(entries))
      } catch {
        /* quota or disabled — drop silently */
      }
    },
  }
}

export class LocalUrlProvider implements ConnectionProvider {
  private readonly presets: Connection[]
  private readonly history: HistoryStore
  private readonly clientFactory: (url: string) => RedClient
  private readonly historyMax: number
  private readonly supportedTransports: Transport[]
  private readonly boot: BootParams | null
  private active: ActiveConnection | null = null

  constructor(opts: LocalUrlProviderOptions = {}) {
    this.presets = opts.presets?.slice() ?? []
    this.history = opts.history ?? inMemoryStore()
    this.historyMax = opts.historyMax ?? HISTORY_MAX_DEFAULT
    this.clientFactory =
      opts.clientFactory ?? ((url) => new RedClient(url))
    this.supportedTransports = opts.transports?.slice() ?? [...BROWSER_TRANSPORTS]
    this.boot = opts.bootParams && hasBootEndpoint(opts.bootParams) ? { ...opts.bootParams } : null
  }

  transports(): Transport[] {
    return this.supportedTransports.slice()
  }

  bootParams(): BootParams | null {
    return this.boot ? { ...this.boot } : null
  }

  async list(): Promise<Connection[]> {
    const seen = new Set<string>()
    const out: Connection[] = []
    for (const p of this.presets) {
      if (seen.has(p.url)) continue
      seen.add(p.url)
      out.push(p)
    }
    for (const h of this.history.load()) {
      if (seen.has(h.url)) continue
      seen.add(h.url)
      out.push({ id: h.url, label: h.label, url: h.url, role: 'primary' })
    }
    return out
  }

  /**
   * Connect by id. The id matches a preset id, a history URL, or a raw URL
   * the caller wants to attempt ad-hoc — that last case is what makes this
   * a *URL* provider rather than a registry. Unknown raw strings that
   * don't look like URLs throw UnknownConnectionError.
   */
  async connect(id: string): Promise<ActiveConnection> {
    const target = this.resolve(id)
    if (!target) throw new UnknownConnectionError(id)

    const client = this.clientFactory(target.url)
    const ping = await client.ping()
    if (!ping.ok) throw new UnreachableConnectionError(target.id, ping.error)

    const active: ActiveConnection = { connection: target, client, rtt_ms: ping.rtt_ms }
    this.active = active
    this.record(target, ping.rtt_ms)
    return active
  }

  async whoami(): Promise<Identity> {
    if (!this.active) throw new NotConnectedError()
    const w = await this.active.client.whoami()
    return { authenticated: w.authenticated, username: w.username, role: w.role }
  }

  /** Test/UI helper: remove a URL from history. Not part of the contract. */
  forget(url: string): void {
    const next = this.history.load().filter((e) => e.url !== url)
    this.history.save(next)
  }

  private resolve(id: string): Connection | null {
    const preset = this.presets.find((p) => p.id === id)
    if (preset) return preset

    const hit = this.history.load().find((e) => e.url === id)
    if (hit) return { id: hit.url, label: hit.label, url: hit.url, role: 'primary' }

    if (/^[a-z+]+:\/\//i.test(id)) {
      let host = id
      try {
        host = new URL(id).host || id
      } catch {
        /* fall through */
      }
      return { id, label: host, url: id, role: 'primary', description: 'Ad-hoc URL.' }
    }

    return null
  }

  private record(c: Connection, rtt_ms: number): void {
    const existing = this.history.load().filter((e) => e.url !== c.url)
    const next: HistoryEntry[] = [
      { url: c.url, label: c.label, last_used: Date.now(), rtt_ms },
      ...existing,
    ].slice(0, this.historyMax)
    this.history.save(next)
  }
}
