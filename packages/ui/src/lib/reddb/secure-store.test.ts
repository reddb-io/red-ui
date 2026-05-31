import { describe, expect, it } from 'vitest'
import { SecureStoreError } from './secure-store'
import { WebEncryptedStore, type WebStorageLike } from './web-encrypted-store'

class MemStorage implements WebStorageLike {
  private map = new Map<string, string>()
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
  /** Test-only inspector. */
  raw(k: string) { return this.map.get(k) }
  rawSet(k: string, v: string) { this.map.set(k, v) }
}

const FAST_ITERATIONS = 1_000  // tests don't need 200k

function makeStore(password = 'correct horse battery staple', storage = new MemStorage()) {
  return {
    storage,
    store: new WebEncryptedStore(password, { storage, iterations: FAST_ITERATIONS }),
  }
}

describe('WebEncryptedStore', () => {
  it('round-trips put/get', async () => {
    const { store } = makeStore()
    await store.put('history:0', 'red://user:secret@db.local:5055')
    const got = await store.get('history:0')
    expect(got).toBe('red://user:secret@db.local:5055')
  })

  it('returns null for missing keys', async () => {
    const { store } = makeStore()
    expect(await store.get('nope')).toBeNull()
  })

  it('delete removes the value', async () => {
    const { store } = makeStore()
    await store.put('k', 'v')
    await store.delete('k')
    expect(await store.get('k')).toBeNull()
  })

  it('persists ciphertext, not plaintext, to storage', async () => {
    const { store, storage } = makeStore()
    await store.put('secret', 'top-secret-value-xyz')
    const raw = storage.raw('red-ui:secure:secret')
    expect(raw).toBeDefined()
    expect(raw).not.toContain('top-secret-value-xyz')
    const env = JSON.parse(raw!) as { v: number; salt: string; nonce: string; ciphertext: string }
    expect(env.v).toBe(1)
    expect(env.salt).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect(env.nonce).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect(env.ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  it('rejects wrong password with DECRYPT_FAILED', async () => {
    const storage = new MemStorage()
    const a = new WebEncryptedStore('right', { storage, iterations: FAST_ITERATIONS })
    await a.put('k', 'hello')
    const b = new WebEncryptedStore('wrong', { storage, iterations: FAST_ITERATIONS })
    await expect(b.get('k')).rejects.toMatchObject({
      name: 'SecureStoreError',
      code: 'DECRYPT_FAILED',
    })
  })

  it('rejects tampered ciphertext with DECRYPT_FAILED', async () => {
    const { store, storage } = makeStore()
    await store.put('k', 'value-that-must-not-leak')
    const raw = storage.raw('red-ui:secure:k')!
    const env = JSON.parse(raw) as { v: number; salt: string; nonce: string; ciphertext: string }
    // Flip the first byte of ciphertext (base64 char) deterministically.
    const flipped = (env.ciphertext[0] === 'A' ? 'B' : 'A') + env.ciphertext.slice(1)
    env.ciphertext = flipped
    storage.rawSet('red-ui:secure:k', JSON.stringify(env))
    await expect(store.get('k')).rejects.toBeInstanceOf(SecureStoreError)
    await expect(store.get('k')).rejects.toMatchObject({ code: 'DECRYPT_FAILED' })
  })

  it('rejects a corrupt (non-JSON) envelope with CORRUPT_ENVELOPE', async () => {
    const { store, storage } = makeStore()
    storage.rawSet('red-ui:secure:bad', 'not json at all')
    await expect(store.get('bad')).rejects.toMatchObject({ code: 'CORRUPT_ENVELOPE' })
  })

  it('rejects an envelope with missing fields', async () => {
    const { store, storage } = makeStore()
    storage.rawSet('red-ui:secure:partial', JSON.stringify({ v: 1, salt: 'abc' }))
    await expect(store.get('partial')).rejects.toMatchObject({ code: 'CORRUPT_ENVELOPE' })
  })

  it('uses a fresh salt+nonce per write (ciphertexts differ for same value)', async () => {
    const { store, storage } = makeStore()
    await store.put('k1', 'same-value')
    const a = storage.raw('red-ui:secure:k1')!
    await store.put('k1', 'same-value')
    const b = storage.raw('red-ui:secure:k1')!
    expect(a).not.toEqual(b)
  })

  it('handles concurrent put without corruption (last writer wins, all readable)', async () => {
    const { store } = makeStore()
    const keys = Array.from({ length: 16 }, (_, i) => `c:${i}`)
    await Promise.all(keys.map((k, i) => store.put(k, `value-${i}`)))
    const values = await Promise.all(keys.map((k) => store.get(k)))
    expect(values).toEqual(keys.map((_, i) => `value-${i}`))
  })

  it('rejects empty master password', () => {
    expect(() => new WebEncryptedStore('', { storage: new MemStorage(), iterations: FAST_ITERATIONS })).toThrow(SecureStoreError)
  })

  it('namespaces keys to avoid collisions across stores', async () => {
    const storage = new MemStorage()
    const a = new WebEncryptedStore('p', { storage, iterations: FAST_ITERATIONS, namespace: 'app-a' })
    const b = new WebEncryptedStore('p', { storage, iterations: FAST_ITERATIONS, namespace: 'app-b' })
    await a.put('shared', 'from-a')
    await b.put('shared', 'from-b')
    expect(await a.get('shared')).toBe('from-a')
    expect(await b.get('shared')).toBe('from-b')
  })
})
