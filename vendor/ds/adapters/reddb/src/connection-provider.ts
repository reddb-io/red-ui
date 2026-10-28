// ConnectionProvider — deep module: the UI's only seam for "how do I
// discover and select databases?". Local OSS lives behind LocalUrlProvider;
// cloud SSO (ReddbIoSsoProvider) will land in a separate slice without
// touching the consumers.

import type { RedClient } from './client'
import type { Transport } from './types'
import type { BootParams } from './boot-params'

export type ConnectionRole = 'primary' | 'replica' | 'embedded'

export interface Connection {
  id: string
  label: string
  url: string
  role?: ConnectionRole
  description?: string
}

export interface Identity {
  authenticated: boolean
  username: string
  role: string
}

export interface ActiveConnection {
  connection: Connection
  client: RedClient
  rtt_ms: number
}

export interface ConnectionProvider {
  list(): Promise<Connection[]>
  connect(id: string): Promise<ActiveConnection>
  whoami(): Promise<Identity>
  /**
   * The wire transports this provider can actually materialize on its Surface
   * (#34, ADR-0003). The Connect UI offers only these, so the user never picks
   * a transport that fails. Optional: a provider that omits it is treated as
   * browser-reachable (http/https + coerced red://) by the consumer.
   */
  transports?(): Transport[]

  /**
   * Non-secret connection config seeded by the Surface (#36, ADR-0005) — the
   * endpoint and initial view from the app URL. The Core reads it through this
   * seam (not a special MCP branch) to connect without the Connect flow.
   * Tokens never appear here. Returns null when nothing was seeded.
   */
  bootParams?(): BootParams | null
}

export class UnknownConnectionError extends Error {
  constructor(public readonly id: string) {
    super(`Unknown connection: ${id}`)
    this.name = 'UnknownConnectionError'
  }
}

export class NotConnectedError extends Error {
  constructor() {
    super('No active connection — call connect() first')
    this.name = 'NotConnectedError'
  }
}

export class UnreachableConnectionError extends Error {
  constructor(public readonly id: string, public readonly reason: string) {
    super(`Connection ${id} unreachable: ${reason}`)
    this.name = 'UnreachableConnectionError'
  }
}
