// Realistic fixtures that exercise every shape red-ui supports.
// Replaced by real protocol responses later.

export interface Column {
  name: string
  type: 'int' | 'text' | 'uuid' | 'timestamp' | 'bool' | 'jsonb' | 'numeric'
  pk?: boolean
  fk?: { table: string; column: string }
  nullable?: boolean
}

export interface TableSchema {
  name: string
  rows: number
  size: string
  columns: Column[]
  sample: Array<Record<string, unknown>>
}

const firstNames = ['Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Hedy', 'Donald']
const lastNames = ['Lovelace', 'Torvalds', 'Hopper', 'Turing', 'Hamilton', 'Ritchie', 'Liskov', 'Thompson', 'Lamarr', 'Knuth']
const statuses = ['active', 'paused', 'churned', 'trial']

function uuid(seed: number) {
  const h = (n: number) => n.toString(16).padStart(4, '0')
  return `${h(seed * 73)}${h(seed * 31)}-${h(seed)}-4${h(seed).slice(1)}-a${h(seed * 7).slice(1)}-${h(seed * 11)}${h(seed * 13)}${h(seed * 17)}`
}

function ts(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString()
}

export const tables: TableSchema[] = [
  {
    name: 'users',
    rows: 1_245_318,
    size: '342 MB',
    columns: [
      { name: 'id', type: 'uuid', pk: true },
      { name: 'email', type: 'text' },
      { name: 'name', type: 'text' },
      { name: 'tenant_id', type: 'uuid', fk: { table: 'tenants', column: 'id' } },
      { name: 'status', type: 'text' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'metadata', type: 'jsonb', nullable: true },
    ],
    sample: Array.from({ length: 500 }, (_, i) => ({
      id: uuid(i + 1),
      email: `${firstNames[i % 10].toLowerCase()}.${lastNames[i % 10].toLowerCase()}+${i}@acme.io`,
      name: `${firstNames[i % 10]} ${lastNames[i % 10]}`,
      tenant_id: uuid(100 + (i % 12)),
      status: statuses[i % 4],
      created_at: ts(i % 365),
      metadata: i % 7 === 0 ? null : { plan: ['free', 'pro', 'enterprise'][i % 3], seats: (i % 50) + 1 },
    })),
  },
  {
    name: 'orders',
    rows: 8_934_211,
    size: '2.1 GB',
    columns: [
      { name: 'id', type: 'uuid', pk: true },
      { name: 'user_id', type: 'uuid', fk: { table: 'users', column: 'id' } },
      { name: 'amount', type: 'numeric' },
      { name: 'currency', type: 'text' },
      { name: 'placed_at', type: 'timestamp' },
      { name: 'shipped', type: 'bool' },
    ],
    sample: Array.from({ length: 500 }, (_, i) => ({
      id: uuid(1000 + i),
      user_id: uuid((i % 200) + 1),
      amount: (Math.sin(i) * 200 + 250).toFixed(2),
      currency: ['USD', 'BRL', 'EUR'][i % 3],
      placed_at: ts(i % 90),
      shipped: i % 5 !== 0,
    })),
  },
  {
    name: 'tenants',
    rows: 412,
    size: '184 KB',
    columns: [
      { name: 'id', type: 'uuid', pk: true },
      { name: 'slug', type: 'text' },
      { name: 'plan', type: 'text' },
      { name: 'mrr_cents', type: 'int' },
    ],
    sample: Array.from({ length: 60 }, (_, i) => ({
      id: uuid(100 + i),
      slug: `acme-${['prod', 'staging', 'dev'][i % 3]}-${i}`,
      plan: ['free', 'pro', 'enterprise'][i % 3],
      mrr_cents: i * 4900 + 9900,
    })),
  },
]

// ---------- Graph fixture ----------
export interface GraphNode { id: string; label: string; type: string; props: Record<string, unknown> }
export interface GraphEdge { id: string; source: string; target: string; label: string }

export const graph = {
  nodes: [
    { id: 'u:1', label: 'Ada Lovelace', type: 'User', props: { joined: '2024-01-12', plan: 'pro' } },
    { id: 'u:2', label: 'Linus Torvalds', type: 'User', props: { joined: '2024-02-04', plan: 'enterprise' } },
    { id: 'u:3', label: 'Grace Hopper', type: 'User', props: { joined: '2024-03-22', plan: 'pro' } },
    { id: 'p:1', label: 'red-ui',  type: 'Project', props: { stars: 1240 } },
    { id: 'p:2', label: 'reddb',   type: 'Project', props: { stars: 5301 } },
    { id: 'p:3', label: 'red-cli', type: 'Project', props: { stars: 421 } },
    { id: 'o:1', label: 'reddb-io', type: 'Org', props: { tier: 'enterprise' } },
  ] as GraphNode[],
  edges: [
    { id: 'e1', source: 'u:1', target: 'p:1', label: 'OWNS' },
    { id: 'e2', source: 'u:1', target: 'p:2', label: 'OWNS' },
    { id: 'e3', source: 'u:2', target: 'p:2', label: 'CONTRIBUTES' },
    { id: 'e4', source: 'u:3', target: 'p:3', label: 'OWNS' },
    { id: 'e5', source: 'u:3', target: 'p:1', label: 'CONTRIBUTES' },
    { id: 'e6', source: 'p:1', target: 'o:1', label: 'BELONGS_TO' },
    { id: 'e7', source: 'p:2', target: 'o:1', label: 'BELONGS_TO' },
    { id: 'e8', source: 'p:3', target: 'o:1', label: 'BELONGS_TO' },
  ] as GraphEdge[],
}

// ---------- KV / Secrets fixture ----------
export interface KVEntry {
  key: string
  type: 'string' | 'json' | 'secret' | 'number' | 'bool'
  value: string
  ttl?: number
  encrypted?: boolean
  updated_at: string
}

export const kv: KVEntry[] = [
  { key: 'config/api/rate-limit', type: 'number', value: '10000', updated_at: ts(3) },
  { key: 'config/api/timeout-ms', type: 'number', value: '30000', updated_at: ts(12) },
  { key: 'config/feature/new-ui', type: 'bool', value: 'true', updated_at: ts(1) },
  { key: 'config/feature/audit-log', type: 'bool', value: 'true', updated_at: ts(8) },
  { key: 'config/email/from', type: 'string', value: 'no-reply@reddb.io', updated_at: ts(45) },
  { key: 'secret/prod/stripe-key', type: 'secret', value: 'sk_live_a1b2c3d4e5f6g7h8i9j0', encrypted: true, updated_at: ts(2) },
  { key: 'secret/prod/sendgrid-key', type: 'secret', value: 'SG.x9y8z7w6v5u4t3s2r1q0', encrypted: true, updated_at: ts(20) },
  { key: 'secret/prod/db-password', type: 'secret', value: 'p@ssw0rd-do-not-share!', encrypted: true, updated_at: ts(7), ttl: 86400 * 30 },
  { key: 'secret/staging/oauth-secret', type: 'secret', value: 'oauth_s3cr3t_2025', encrypted: true, updated_at: ts(4) },
  { key: 'cache/user/u:1', type: 'json', value: '{"name":"Ada Lovelace","cached":true}', ttl: 300, updated_at: ts(0) },
  { key: 'cache/user/u:2', type: 'json', value: '{"name":"Linus Torvalds","cached":true}', ttl: 300, updated_at: ts(0) },
  { key: 'session/abc123', type: 'json', value: '{"user_id":"u:1","exp":1735689600}', ttl: 3600, updated_at: ts(0) },
]

// ---------- Hypertable fixture (timeseries) ----------
export interface HyperPoint { t: number; cpu: number; mem: number; qps: number }

export const hyperSeries: HyperPoint[] = Array.from({ length: 168 }, (_, i) => {
  const t = Date.now() - (168 - i) * 3600_000
  const hour = new Date(t).getHours()
  const daily = Math.sin((hour / 24) * Math.PI * 2) * 0.4 + 0.5
  return {
    t,
    cpu: Math.max(0, Math.min(100, daily * 60 + Math.random() * 15 + (i > 140 ? 20 : 0))),
    mem: Math.max(0, Math.min(100, 40 + Math.sin(i / 12) * 8 + Math.random() * 4)),
    qps: Math.max(0, daily * 5000 + Math.random() * 800 + (i > 150 ? 1500 : 0)),
  }
})

// ---------- Stats fixture ----------
export const stats = {
  cluster: { primaries: 1, replicas: 3, total_size: '48.7 GB', keys: '11.2M', ops_per_sec: 4234 },
  nodes: [
    { id: 'primary', size_gb: 12.4, keys_m: 1.2, cpu: 64, mem: 48, lag_ms: 0 },
    { id: 'replica-1', size_gb: 12.1, keys_m: 1.2, cpu: 32, mem: 44, lag_ms: 2 },
    { id: 'replica-2', size_gb: 12.0, keys_m: 1.2, cpu: 35, mem: 46, lag_ms: 5 },
    { id: 'replica-3', size_gb: 12.2, keys_m: 1.2, cpu: 28, mem: 41, lag_ms: 1 },
  ],
  top_keys: [
    { key: 'cache/user/u:*', count: 1_245_000, size: '128 MB' },
    { key: 'session/*', count: 84_000, size: '42 MB' },
    { key: 'orders/*', count: 8_934_000, size: '2.1 GB' },
  ],
}

// ---------- Admin fixtures ----------
export interface User { id: string; email: string; role: string; tenant: string; last_active: string; mfa: boolean }
export const users: User[] = [
  { id: uuid(1), email: 'filipe@reddb.io',  role: 'owner',  tenant: 'reddb-io',  last_active: ts(0), mfa: true },
  { id: uuid(2), email: 'morgan@acme.io',   role: 'dba',    tenant: 'acme-prod', last_active: ts(0), mfa: true },
  { id: uuid(3), email: 'sam@acme.io',      role: 'writer', tenant: 'acme-prod', last_active: ts(1), mfa: false },
  { id: uuid(4), email: 'reader@acme.io',   role: 'reader', tenant: 'acme-prod', last_active: ts(7), mfa: false },
  { id: uuid(5), email: 'audit@vendor.com', role: 'reader', tenant: 'acme-prod', last_active: ts(30), mfa: true },
]

export interface Policy { id: string; name: string; effect: 'allow' | 'deny'; actions: string[]; resources: string[]; principals: string[] }
export const policies: Policy[] = [
  { id: 'pol_1', name: 'readers-can-read',         effect: 'allow', actions: ['read'],            resources: ['table', 'graph', 'kv'], principals: ['role:reader'] },
  { id: 'pol_2', name: 'writers-can-write',        effect: 'allow', actions: ['write', 'read'],   resources: ['table', 'graph', 'kv'], principals: ['role:writer'] },
  { id: 'pol_3', name: 'dba-can-reveal-secrets',   effect: 'allow', actions: ['reveal'],          resources: ['secret'],               principals: ['role:dba', 'role:owner'] },
  { id: 'pol_4', name: 'no-prod-deletes-on-fri',   effect: 'deny',  actions: ['delete'],          resources: ['table'],                principals: ['*'] },
  { id: 'pol_5', name: 'only-owner-touches-admin', effect: 'allow', actions: ['admin'],           resources: ['users', 'policies', 'tenants'], principals: ['role:owner'] },
]

export interface Tenant { id: string; slug: string; plan: string; mrr: number; users: number; created: string }
export const tenants: Tenant[] = [
  { id: uuid(101), slug: 'reddb-io',   plan: 'internal',   mrr: 0,     users: 12,  created: ts(720) },
  { id: uuid(102), slug: 'acme-prod',  plan: 'enterprise', mrr: 4900,  users: 84,  created: ts(412) },
  { id: uuid(103), slug: 'globex',     plan: 'pro',        mrr: 990,   users: 22,  created: ts(180) },
  { id: uuid(104), slug: 'initech',    plan: 'free',       mrr: 0,     users: 3,   created: ts(60) },
  { id: uuid(105), slug: 'umbrella',   plan: 'enterprise', mrr: 12900, users: 240, created: ts(900) },
]
