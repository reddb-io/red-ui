import { describe, expect, it, vi } from 'vitest'
import { InjectedClientProvider } from './injected-client-provider'
import { NotConnectedError, UnknownConnectionError } from './connection-provider'
import { runConnectionProviderContract } from './connection-provider.contract'
import type { RedClient } from './client'

// A minimal fake client — only the methods the provider touches. The host
// would hand in a real, authenticated RedClient; here we stub the surface.
function fakeClient(over: Partial<RedClient> = {}): RedClient {
  return {
    ping: vi.fn(async () => ({ ok: true, rtt_ms: 7 })),
    whoami: vi.fn(async () => ({ authenticated: true, username: 'svc', role: 'admin' })),
    ...over,
  } as unknown as RedClient
}

// The seam stays honest: the host-injected provider satisfies the same
// contract every other provider does.
runConnectionProviderContract('InjectedClientProvider', () => {
  const provider = new InjectedClientProvider({ client: fakeClient() })
  return { provider, knownId: provider.connection.id, unknownId: 'no-such-connection' }
})

describe('InjectedClientProvider', () => {
  it('list() surfaces exactly the one host connection', async () => {
    const provider = new InjectedClientProvider({
      client: fakeClient(),
      connection: { id: 'app-db', label: 'App DB', url: 'red://host/app' },
    })
    const items = await provider.list()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'app-db', label: 'App DB', url: 'red://host/app' })
  })

  it('connect() returns the exact host-supplied client (no construction)', async () => {
    const client = fakeClient()
    const provider = new InjectedClientProvider({ client })
    const active = await provider.connect('host')
    expect(active.client).toBe(client) // same instance — Core never builds one
    expect(active.rtt_ms).toBe(7)
  })

  it('connect() to a foreign id rejects with UnknownConnectionError', async () => {
    const provider = new InjectedClientProvider({ client: fakeClient() })
    await expect(provider.connect('elsewhere')).rejects.toBeInstanceOf(UnknownConnectionError)
  })

  it('connect() still yields an ActiveConnection when the probe fails (host vouches)', async () => {
    const client = fakeClient({ ping: vi.fn(async () => ({ ok: false, rtt_ms: 0, error: 'down' })) })
    const provider = new InjectedClientProvider({ client })
    const active = await provider.connect('host')
    expect(active.client).toBe(client)
    expect(active.rtt_ms).toBe(0)
  })

  it('whoami() before connect rejects, after connect delegates to the client', async () => {
    const provider = new InjectedClientProvider({ client: fakeClient() })
    await expect(provider.whoami()).rejects.toBeInstanceOf(NotConnectedError)
    await provider.connect('host')
    expect(await provider.whoami()).toEqual({ authenticated: true, username: 'svc', role: 'admin' })
  })
})
