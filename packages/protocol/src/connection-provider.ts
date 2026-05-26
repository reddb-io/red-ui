// ConnectionProvider — deep module: the UI's only seam for "how do I
// discover and select databases?". Local OSS lives behind LocalUrlProvider;
// cloud SSO (ReddbIoSsoProvider) will land in a separate slice without
// touching the consumers.

import type { RedClient } from './client'

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
