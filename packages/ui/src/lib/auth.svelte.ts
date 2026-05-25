// Permission-aware foundation. Stub that mimics what red-ui will ask the
// reddb policy engine. Centralizing this means every view stays consistent
// and we can swap the stub for the real client later without churn.

export type Action = 'read' | 'write' | 'delete' | 'reveal' | 'admin'
export type Resource =
  | 'table' | 'graph' | 'kv' | 'secret' | 'hypertable' | 'stats'
  | 'users' | 'policies' | 'tenants'

export interface Identity {
  name: string
  role: 'reader' | 'writer' | 'dba' | 'owner'
  tenant: string
  grants: Array<{ action: Action; resource: Resource }>
  denies: Array<{ action: Action; resource: Resource; reason: string }>
}

const READER_GRANTS: Identity['grants'] = [
  { action: 'read', resource: 'table' },
  { action: 'read', resource: 'graph' },
  { action: 'read', resource: 'kv' },
  { action: 'read', resource: 'hypertable' },
  { action: 'read', resource: 'stats' },
]

const WRITER_GRANTS: Identity['grants'] = [
  ...READER_GRANTS,
  { action: 'write', resource: 'table' },
  { action: 'write', resource: 'graph' },
  { action: 'write', resource: 'kv' },
  { action: 'write', resource: 'hypertable' },
]

const DBA_GRANTS: Identity['grants'] = [
  ...WRITER_GRANTS,
  { action: 'delete', resource: 'table' },
  { action: 'reveal', resource: 'secret' },
  { action: 'read', resource: 'users' },
  { action: 'read', resource: 'policies' },
  { action: 'read', resource: 'tenants' },
]

const OWNER_GRANTS: Identity['grants'] = [
  ...DBA_GRANTS,
  { action: 'admin', resource: 'users' },
  { action: 'admin', resource: 'policies' },
  { action: 'admin', resource: 'tenants' },
  { action: 'write', resource: 'secret' },
  { action: 'delete', resource: 'kv' },
]

const PROFILES: Record<Identity['role'], Identity['grants']> = {
  reader: READER_GRANTS,
  writer: WRITER_GRANTS,
  dba: DBA_GRANTS,
  owner: OWNER_GRANTS,
}

function makeIdentity(role: Identity['role']): Identity {
  return {
    name: role === 'owner' ? 'filipe' : role === 'dba' ? 'morgan' : role === 'writer' ? 'sam' : 'guest',
    role,
    tenant: 'acme-prod',
    grants: PROFILES[role],
    denies: role === 'reader'
      ? [{ action: 'reveal', resource: 'secret', reason: 'requires role >= dba' }]
      : role === 'writer'
        ? [{ action: 'reveal', resource: 'secret', reason: 'requires role >= dba' }]
        : [],
  }
}

class AuthStore {
  identity = $state<Identity>(makeIdentity('writer'))

  can(action: Action, resource: Resource) {
    return this.identity.grants.some((g) => g.action === action && g.resource === resource)
  }

  whyDenied(action: Action, resource: Resource): string | null {
    const explicit = this.identity.denies.find((d) => d.action === action && d.resource === resource)
    if (explicit) return explicit.reason
    if (this.can(action, resource)) return null
    return `your role \`${this.identity.role}\` does not grant ${action}:${resource}`
  }

  switchRole(role: Identity['role']) {
    this.identity = makeIdentity(role)
  }
}

export const auth = new AuthStore()

// Audit log — every reveal of a secret, every destructive action goes here.
// In production this writes to reddb itself; for now it's in-memory.
export interface AuditEntry {
  at: string
  who: string
  action: Action
  resource: Resource
  target: string
  detail?: string
}

class AuditStore {
  entries = $state<AuditEntry[]>([])

  log(action: Action, resource: Resource, target: string, detail?: string) {
    this.entries = [
      { at: new Date().toISOString(), who: auth.identity.name, action, resource, target, detail },
      ...this.entries,
    ].slice(0, 100)
  }
}

export const audit = new AuditStore()
