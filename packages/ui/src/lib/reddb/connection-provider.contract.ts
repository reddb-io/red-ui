// Contract tests for ConnectionProvider. Every implementation (LocalUrlProvider,
// the in-memory mock, future ReddbIoSsoProvider) runs through this suite, so
// the seam stays honest: behaviour, not just types.

import { describe, expect, it } from 'vitest'
import {
  NotConnectedError,
  UnknownConnectionError,
  type Connection,
  type ConnectionProvider,
} from './connection-provider'

export interface ContractFixture {
  provider: ConnectionProvider
  /** A connection id the provider promises to resolve in connect(). */
  knownId: string
  /** A connection id the provider promises NOT to resolve. */
  unknownId: string
}

export function runConnectionProviderContract(
  name: string,
  build: () => ContractFixture | Promise<ContractFixture>,
) {
  describe(`ConnectionProvider contract — ${name}`, () => {
    it('list() returns Connection objects with id/label/url', async () => {
      const { provider } = await build()
      const items = await provider.list()
      expect(Array.isArray(items)).toBe(true)
      for (const c of items) {
        expect(typeof c.id).toBe('string')
        expect(typeof c.label).toBe('string')
        expect(typeof c.url).toBe('string')
      }
    })

    it('list() entries have unique ids', async () => {
      const { provider } = await build()
      const items: Connection[] = await provider.list()
      const ids = items.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('connect(knownId) resolves to an ActiveConnection', async () => {
      const { provider, knownId } = await build()
      const active = await provider.connect(knownId)
      expect(active.connection.id).toBe(knownId)
      expect(active.client).toBeTruthy()
      expect(typeof active.rtt_ms).toBe('number')
      expect(active.rtt_ms).toBeGreaterThanOrEqual(0)
    })

    it('connect(unknownId) rejects with UnknownConnectionError', async () => {
      const { provider, unknownId } = await build()
      await expect(provider.connect(unknownId)).rejects.toBeInstanceOf(UnknownConnectionError)
    })

    it('whoami() before connect rejects with NotConnectedError', async () => {
      const { provider } = await build()
      await expect(provider.whoami()).rejects.toBeInstanceOf(NotConnectedError)
    })

    it('whoami() after connect resolves to an Identity', async () => {
      const { provider, knownId } = await build()
      await provider.connect(knownId)
      const id = await provider.whoami()
      expect(typeof id.authenticated).toBe('boolean')
      expect(typeof id.username).toBe('string')
      expect(typeof id.role).toBe('string')
    })
  })
}
