// Real HTTP client for a running reddb instance.
// Endpoints discovered from reddb/crates/reddb-server/src/server/routing.rs.

export interface QueryRow {
  values: Record<string, unknown>
  edges?: Record<string, unknown>
  nodes?: Record<string, unknown>
  paths?: unknown[]
  vector_results?: Array<{
    id?: number | string
    collection?: string
    distance?: number
    vector?: number[]
    metadata?: Record<string, unknown>
    linked_node?: string
    linked_row?: [string, number]
  }>
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

export interface CollectionMetadata {
  ok?: boolean
  name: string
  kind?: string
  capability?: string
  capabilities?: string[]
  schema?: Record<string, unknown>
  indexes?: Array<Record<string, unknown>>
  retention?: Record<string, unknown>
  tenant?: string
  actions?: Record<string, boolean | { allowed: boolean; reason?: string }>
}

export interface Stats {
  active_connections: number
  idle_connections: number
  started_at_unix_ms: number
  store: { collection_count: number; cross_ref_count: number; total_entities: number; total_memory_bytes: number }
  system: { arch: string; cpu_cores: number; hostname: string; os: string; pid: number; total_memory_bytes: number; available_memory_bytes: number }
  kv?: { gets: number; puts: number; deletes: number; cas_success: number; cas_conflict: number }
}

export interface ClusterStatus {
  ok?: boolean
  deployment?: {
    mode?: 'embedded' | 'server' | 'docker' | 'replicated' | string
    file_path?: string
    process_kind?: string
    container_id?: string
    image?: string
    configured_by?: string
  }
  storage?: {
    capacity_bytes?: number
    used_bytes?: number
    free_bytes?: number
  }
  wal?: {
    size_bytes?: number
    lsn?: number
    oldest_lsn?: number
  }
  throughput?: {
    requests_per_second?: number
    reads_per_second?: number
    writes_per_second?: number
    avg_response_ms?: number
  }
  system?: {
    cpu_usage_percent?: number
    memory_used_bytes?: number
    memory_total_bytes?: number
  }
  replication?: {
    replica_count?: number
    lag_ms?: number
    lag_lsn?: number
  }
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

export interface AuthTenant {
  id?: string
  name?: string
  slug?: string
  role?: string
  grants?: string[]
  created_at?: number
}

export interface AuthPolicy {
  id?: string
  name?: string
  tenant?: string
  principal?: string
  resource?: string
  action?: string
  effect?: 'allow' | 'deny' | string
  description?: string
  created_at?: number
}

export interface ChangeEvent {
  lsn: number
  timestamp: number
  collection: string
  kind: string
  operation: 'insert' | 'update' | 'delete'
  rid?: number
}

export interface RedClientOptions {
  /**
   * When set, requests go through a same-origin proxy at this path
   * instead of directly to baseUrl (needed because reddb doesn't send
   * CORS headers). The proxy receives the target via X-Red-Target.
   * Set to '/_red' in browser dev/prod; leave undefined in Tauri/Node
   * where direct fetch works.
   */
  proxyPath?: string
}

function shouldProxy(opts?: RedClientOptions): string | null {
  if (opts?.proxyPath) return opts.proxyPath
  // Auto-detect: in a browser, fetch is subject to CORS. Use proxy by default
  // unless caller explicitly opts out. In Tauri the user is expected to wire
  // up Rust-side fetch and pass proxyPath: ''.
  if (typeof window !== 'undefined') return '/_red'
  return null
}

const unsupportedCollectionMetadata = new Set<string>()
const collectionMetadataSupportProbe = new Map<string, Promise<boolean>>()

function isUnsupportedCollectionMetadataRoute(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e)
  return message.includes('route not found: GET /collections/')
}

function unsupportedCollectionMetadataError(baseUrl: string): Error {
  return new Error(`GET /collections/:name unsupported by this reddb server (${baseUrl})`)
}

export class RedClient {
  readonly baseUrl: string
  private readonly proxyPath: string | null

  constructor(baseUrl: string, opts?: RedClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.proxyPath = shouldProxy(opts)
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const url = this.proxyPath ? `${this.proxyPath}${path}` : `${this.baseUrl}${path}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.proxyPath) headers['X-Red-Target'] = this.baseUrl
    Object.assign(headers, init?.headers as Record<string, string> | undefined)

    const res = await fetch(url, { ...init, headers })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status} ${body.slice(0, 200)}`)
    }
    return res.json() as Promise<T>
  }

  async stats(): Promise<Stats> {
    return this.json<Stats>('/stats')
  }

  async clusterStatus(): Promise<ClusterStatus> {
    return this.json<ClusterStatus>('/cluster/status')
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

  async collection(name: string): Promise<CollectionMetadata> {
    if (unsupportedCollectionMetadata.has(this.baseUrl)) {
      throw unsupportedCollectionMetadataError(this.baseUrl)
    }

    const path = `/collections/${encodeURIComponent(name)}`
    const inFlightProbe = collectionMetadataSupportProbe.get(this.baseUrl)
    if (inFlightProbe) {
      const supported = await inFlightProbe
      if (!supported) throw unsupportedCollectionMetadataError(this.baseUrl)
      return this.json<CollectionMetadata>(path)
    }

    let resolveProbe: (supported: boolean) => void
    const probe = new Promise<boolean>((resolve) => {
      resolveProbe = resolve
    })
    collectionMetadataSupportProbe.set(this.baseUrl, probe)

    try {
      const metadata = await this.json<CollectionMetadata>(path)
      resolveProbe!(true)
      return metadata
    } catch (e) {
      if (isUnsupportedCollectionMetadataRoute(e)) {
        unsupportedCollectionMetadata.add(this.baseUrl)
        resolveProbe!(false)
      } else {
        resolveProbe!(true)
      }
      throw e
    } finally {
      collectionMetadataSupportProbe.delete(this.baseUrl)
    }
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

  async tenants(): Promise<AuthTenant[]> {
    const r = await this.json<{ ok: boolean; tenants: AuthTenant[] }>('/auth/tenants')
    return r.tenants ?? []
  }

  async policies(): Promise<AuthPolicy[]> {
    const r = await this.json<{ ok: boolean; policies: AuthPolicy[] }>('/auth/policies')
    return r.policies ?? []
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
