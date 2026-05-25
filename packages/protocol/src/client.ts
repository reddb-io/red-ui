// Real HTTP client for a running reddb instance.
// Endpoints discovered from reddb/crates/reddb-server/src/server/routing.rs.

export interface QueryRow {
  values: Record<string, unknown>
  edges?: Record<string, unknown>
  nodes?: Record<string, unknown>
}

export interface QueryResult {
  ok: boolean
  query: string
  capability?: string
  engine?: string
  mode?: string
  record_count: number
  result: { columns: string[]; records: QueryRow[] }
  error?: string
}

export interface Stats {
  active_connections: number
  idle_connections: number
  started_at_unix_ms: number
  store: { collection_count: number; cross_ref_count: number; total_entities: number; total_memory_bytes: number }
  system: { arch: string; cpu_cores: number; hostname: string; os: string; pid: number; total_memory_bytes: number; available_memory_bytes: number }
  kv?: { gets: number; puts: number; deletes: number; cas_success: number; cas_conflict: number }
}

export interface ReplicationStatus {
  ok: boolean
  role: 'primary' | 'replica' | 'standalone'
  state?: 'healthy' | 'lagging' | 'disconnected'
  primary_addr?: string
  /** primary perspective */
  wal_lsn?: number
  oldest_lsn?: number
  replica_count?: number
  /** replica perspective */
  last_applied_lsn?: number
  last_seen_primary_lsn?: number
  last_seen_oldest_lsn?: number
}

export interface Whoami {
  ok: boolean
  authenticated: boolean
  username: string
  role: string
  note?: string
}

export interface AuthUser {
  username: string
  role?: string
  created_at?: number
  last_active?: number
  mfa?: boolean
}

export interface ChangeEvent {
  lsn: number
  timestamp: number
  collection: string
  kind: string
  operation: 'insert' | 'update' | 'delete'
  rid?: number
}

export class RedClient {
  constructor(public readonly baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status} ${body.slice(0, 200)}`)
    }
    return res.json() as Promise<T>
  }

  async stats(): Promise<Stats> {
    return this.json<Stats>('/stats')
  }

  async ping(): Promise<{ ok: true; rtt_ms: number } | { ok: false; error: string }> {
    const start = performance.now()
    try {
      await this.json('/stats')
      return { ok: true, rtt_ms: Math.round(performance.now() - start) }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }

  async collections(): Promise<string[]> {
    const r = await this.json<{ collections: string[] }>('/collections')
    return r.collections
  }

  async createCollection(name: string): Promise<void> {
    await this.json('/collections', { method: 'POST', body: JSON.stringify({ name }) })
  }

  async insertDocument(collection: string, doc: Record<string, unknown>): Promise<{ id: number }> {
    return this.json<{ id: number }>(`/collections/${encodeURIComponent(collection)}/documents`, {
      method: 'POST',
      body: JSON.stringify(doc),
    })
  }

  async query(query: string): Promise<QueryResult> {
    return this.json<QueryResult>('/query', { method: 'POST', body: JSON.stringify({ query }) })
  }

  async replication(): Promise<ReplicationStatus> {
    return this.json<ReplicationStatus>('/replication/status').catch(() => ({
      ok: false,
      role: 'standalone' as const,
    }))
  }

  async whoami(): Promise<Whoami> {
    return this.json<Whoami>('/auth/whoami')
  }

  async users(): Promise<AuthUser[]> {
    const r = await this.json<{ ok: boolean; users: AuthUser[] }>('/auth/users')
    return r.users
  }

  async changes(sinceLsn?: number): Promise<ChangeEvent[]> {
    const qs = sinceLsn !== undefined ? `?since=${sinceLsn}` : ''
    const r = await this.json<{ events: ChangeEvent[] }>('/changes' + qs)
    return r.events ?? []
  }

  // Convenience: turn a /query response into plain row objects.
  async rows(query: string): Promise<Array<Record<string, unknown>>> {
    const r = await this.query(query)
    return r.result.records.map((rec) => rec.values)
  }
}
