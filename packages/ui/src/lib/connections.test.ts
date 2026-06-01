import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  connection,
  getConnectionProvider,
  provider,
  setConnectionProvider,
} from './connections.svelte'
import { InjectedClientProvider, LocalUrlProvider } from '#reddb'
import type { RedClient } from '#reddb'

// Fake client covering every method tryConnect touches (ping/stats/replication
// on connect, whoami on demand). The host would inject a real one.
function fakeClient(): RedClient {
  return {
    ping: vi.fn(async () => ({ ok: true, rtt_ms: 3 })),
    stats: vi.fn(async () => ({ collections: 0, records: 0 })),
    replication: vi.fn(async () => undefined),
    whoami: vi.fn(async () => ({ authenticated: true, username: 'host', role: 'admin' })),
  } as unknown as RedClient
}

afterEach(() => {
  // Restore the default seam so tests don't leak the injected provider.
  setConnectionProvider(provider)
  connection.disconnect()
})

describe('connection seam (ADR-0001)', () => {
  it('defaults to the LocalUrlProvider so the PWA/Desktop Connect flow is unchanged', () => {
    expect(getConnectionProvider()).toBe(provider)
    expect(provider).toBeInstanceOf(LocalUrlProvider)
  })

  it('adopting a host-injected provider connects without the Connect flow', async () => {
    const client = fakeClient()
    setConnectionProvider(new InjectedClientProvider({ client }))

    expect(connection.connected).toBe(false) // Connect flow would still gate here
    const ok = await connection.adoptInjected()

    expect(ok).toBe(true)
    expect(connection.connected).toBe(true)
    // The Core's client is the exact instance the host injected — never built here.
    expect(connection.client).toBe(client)
    expect(connection.probe.reachable).toBe(true)
  })

  it('the Core only ever exposes the provider-supplied client', async () => {
    const client = fakeClient()
    setConnectionProvider(new InjectedClientProvider({ client }))
    await connection.adoptInjected()
    expect(connection.client).toBe(client)

    connection.disconnect()
    expect(connection.client).toBeNull() // no URL-built fallback
  })
})
