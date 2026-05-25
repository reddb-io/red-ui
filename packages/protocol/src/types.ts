export type NodeRole = 'primary' | 'replica' | 'embedded'

export type Transport = 'tcp' | 'tls' | 'unix' | 'http' | 'https'

export interface ConnectionTarget {
  transport: Transport
  host: string
  port?: number
  path?: string
  database?: string
  username?: string
  password?: string
  role?: NodeRole
  params: Record<string, string>
}

export interface NodeStats {
  id: string
  role: NodeRole
  host: string
  bytesUsed: number
  bytesAvailable: number
  keyCount: number
  lagBytes?: number
  uptimeSeconds: number
}

export interface Topology {
  primary: NodeStats
  replicas: NodeStats[]
  observedAt: string
}
