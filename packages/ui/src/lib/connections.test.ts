import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  connection,
  getConnectionProvider,
  provider,
  setConnectionProvider,
} from './connections.svelte'
import { EMPTY_SERVER_CAPABILITIES, InjectedClientProvider, LocalUrlProvider } from '#reddb'
import type { RedClient, ServerCapabilities } from '#reddb'

interface FakeOpts {
  /** Extra fields merged into the /stats response (e.g. read_only for #23). */
  stats?: Record<string, unknown>
  /** Capability map the client reports (#22). Defaults to all-unsupported. */
  capabilities?: Partial<ServerCapabilities>
}

// Fake client covering every method tryConnect touches (ping/stats/replication/
// capabilities on connect, whoami on demand). The host would inject a real one.
function fakeClient({ stats = {}, capabilities }: FakeOpts = {}): RedClient {
  return {
    ping: vi.fn(async () => ({ ok: true, rtt_ms: 3 })),
    stats: vi.fn(async () => ({ collections: 0, records: 0, ...stats })),
    replication: vi.fn(async () => undefined),
    capabilities: vi.fn(async (): Promise<ServerCapabilities> => ({
      ...EMPTY_SERVER_CAPABILITIES,
      ...capabilities,
    })),
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

describe('read-only state (#23)', () => {
  it('is false when the server reports no read-only signal', async () => {
    setConnectionProvider(new InjectedClientProvider({ client: fakeClient() }))
    await connection.adoptInjected()
    expect(connection.connected).toBe(true)
    expect(connection.readOnly).toBe(false)
  })

  it('is true, with the reason, when the server reports read_only', async () => {
    setConnectionProvider(
      new InjectedClientProvider({
        client: fakeClient({ stats: { read_only: true, read_only_reason: 'file in use by another writer' } }),
      }),
    )
    await connection.adoptInjected()
    expect(connection.readOnly).toBe(true)
    expect(connection.readOnlyReason).toBe('file in use by another writer')
  })

  it('is false once disconnected even if the last probe was read-only', async () => {
    setConnectionProvider(new InjectedClientProvider({ client: fakeClient({ stats: { read_only: true } }) }))
    await connection.adoptInjected()
    expect(connection.readOnly).toBe(true)
    connection.disconnect()
    expect(connection.readOnly).toBe(false) // gated on `connected`, never hardcoded
  })
})

describe('capability negotiation (#22)', () => {
  it('exposes the capabilities the server reports at connect', async () => {
    setConnectionProvider(new InjectedClientProvider({ client: fakeClient({ capabilities: { vcs: true } }) }))
    await connection.adoptInjected()
    expect(connection.capabilities.vcs).toBe(true)
    expect(connection.capabilities.clusterStatus).toBe(false) // not reported ⇒ stays hidden
  })

  it('defaults to all-unsupported before connect and resets on disconnect', async () => {
    expect(connection.capabilities).toEqual(EMPTY_SERVER_CAPABILITIES)
    setConnectionProvider(new InjectedClientProvider({ client: fakeClient({ capabilities: { vcs: true } }) }))
    await connection.adoptInjected()
    expect(connection.capabilities.vcs).toBe(true)
    connection.disconnect()
    expect(connection.capabilities).toEqual(EMPTY_SERVER_CAPABILITIES)
  })

  it('fails safe to all-unsupported when capability resolution throws', async () => {
    const client = fakeClient()
    ;(client.capabilities as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('probe blew up'))
    setConnectionProvider(new InjectedClientProvider({ client }))
    await connection.adoptInjected()
    expect(connection.connected).toBe(true) // connect still succeeds
    expect(connection.capabilities).toEqual(EMPTY_SERVER_CAPABILITIES) // hide on failure
  })
})
