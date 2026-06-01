// InjectedClientProvider — the embed-Surface implementation of
// ConnectionProvider. The embedding host owns auth (ADR-0001 / ADR-0005): it
// constructs and authenticates a RedClient, then hands it to the Core. The
// Core stays agnostic — it acquires its client through the same
// ConnectionProvider seam as the PWA/Desktop Surfaces, never knowing whether
// the connection came from a Connect flow or from its host.
//
// Unlike LocalUrlProvider this is a *single-connection* provider: there is no
// discovery, no history, no Connect flow. `list()` surfaces exactly one
// connection and `connect()` returns the host-supplied client immediately. A
// ping only measures RTT for the status bar — a failed probe does NOT block
// the mount, because the host vouches for the client it injected.

import type { RedClient } from './client'
import {
  NotConnectedError,
  UnknownConnectionError,
  type ActiveConnection,
  type Connection,
  type ConnectionProvider,
  type Identity,
} from './connection-provider'

export interface InjectedClientOptions {
  /** The host-supplied, already-authenticated client. */
  client: RedClient
  /** UI metadata for the single connection this provider exposes. */
  connection?: Partial<Connection>
}

export class InjectedClientProvider implements ConnectionProvider {
  private readonly client: RedClient
  /** The sole connection this provider resolves. */
  readonly connection: Connection
  private connected = false

  constructor(opts: InjectedClientOptions) {
    this.client = opts.client
    this.connection = {
      id: opts.connection?.id ?? 'host',
      label: opts.connection?.label ?? 'Host connection',
      url: opts.connection?.url ?? '',
      role: opts.connection?.role ?? 'primary',
      description: opts.connection?.description ?? 'Injected by the embedding host.',
    }
  }

  async list(): Promise<Connection[]> {
    return [this.connection]
  }

  /**
   * Resolve the single host connection. Any other id throws
   * UnknownConnectionError — there is nothing else to connect to. The probe is
   * best-effort: an unreachable host still yields an ActiveConnection (rtt 0)
   * rather than rejecting, since the host owns the client's lifecycle.
   */
  async connect(id: string): Promise<ActiveConnection> {
    if (id !== this.connection.id) throw new UnknownConnectionError(id)
    let rtt_ms = 0
    try {
      const ping = await this.client.ping()
      if (ping.ok) rtt_ms = ping.rtt_ms
    } catch {
      /* host vouches for the client — surface rtt 0, don't block the mount */
    }
    this.connected = true
    return { connection: this.connection, client: this.client, rtt_ms }
  }

  async whoami(): Promise<Identity> {
    if (!this.connected) throw new NotConnectedError()
    const w = await this.client.whoami()
    return { authenticated: w.authenticated, username: w.username, role: w.role }
  }
}
