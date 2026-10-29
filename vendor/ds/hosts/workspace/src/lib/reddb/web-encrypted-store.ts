import { type EncryptedStore, SecureStoreError } from './secure-store'

/**
 * Storage envelope persisted per-key in the backing KV. Versioned so the
 * format can evolve without silently breaking older payloads.
 */
interface Envelope {
  v: 1
  salt: string        // base64, per-key
  nonce: string       // base64, per-write
  ciphertext: string  // base64
}

export interface WebStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface WebEncryptedStoreOptions {
  /** Namespace prefix applied to every key before storage. */
  namespace?: string
  /** Storage backend. Defaults to globalThis.localStorage when present. */
  storage?: WebStorageLike
  /** PBKDF2 iterations. Default 200k. */
  iterations?: number
  /** Web Crypto SubtleCrypto override (for tests). */
  subtle?: SubtleCrypto
}

const DEFAULT_ITERATIONS = 200_000
const SALT_BYTES = 16
const NONCE_BYTES = 12

function toB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// TS's DOM lib widens `Uint8Array#buffer` to `ArrayBuffer | SharedArrayBuffer`,
// which the Web Crypto signatures reject. Copy the view into a fresh
// ArrayBuffer so the cast is sound at runtime.
function bufOf(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength)
  new Uint8Array(out).set(view)
  return out
}

/**
 * Browser-grade encrypted KV. A single instance is bound to one master
 * password for its lifetime — to rotate, instantiate a fresh store.
 *
 * The password material itself is never persisted; only PBKDF2-derived
 * AES-GCM keys are cached in memory per-salt for the lifetime of the
 * instance.
 */
export class WebEncryptedStore implements EncryptedStore {
  private readonly storage: WebStorageLike
  private readonly namespace: string
  private readonly iterations: number
  private readonly subtle: SubtleCrypto
  private readonly password: string
  private readonly keyCache = new Map<string, CryptoKey>()

  constructor(password: string, opts: WebEncryptedStoreOptions = {}) {
    if (typeof password !== 'string' || password.length === 0) {
      throw new SecureStoreError('LOCKED', 'master password required')
    }
    const storage = opts.storage ?? (typeof globalThis !== 'undefined' ? (globalThis as { localStorage?: WebStorageLike }).localStorage : undefined)
    if (!storage) {
      throw new SecureStoreError('BACKEND_FAILURE', 'no Storage backend available')
    }
    const subtle = opts.subtle ?? (typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto?.subtle : undefined)
    if (!subtle) {
      throw new SecureStoreError('BACKEND_FAILURE', 'Web Crypto SubtleCrypto unavailable')
    }
    this.password = password
    this.storage = storage
    this.namespace = opts.namespace ?? 'red-ui:secure'
    this.iterations = opts.iterations ?? DEFAULT_ITERATIONS
    this.subtle = subtle
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  private async deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    const saltKey = toB64(salt)
    const cached = this.keyCache.get(saltKey)
    if (cached) return cached
    const enc = new TextEncoder().encode(this.password)
    const material = await this.subtle.importKey(
      'raw',
      bufOf(enc),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    const key = await this.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: bufOf(salt),
        iterations: this.iterations,
        hash: 'SHA-256',
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    this.keyCache.set(saltKey, key)
    return key
  }

  private randomBytes(n: number): Uint8Array {
    const out = new Uint8Array(n)
    const c = (globalThis as { crypto?: Crypto }).crypto
    if (!c) throw new SecureStoreError('BACKEND_FAILURE', 'crypto.getRandomValues unavailable')
    c.getRandomValues(out)
    return out
  }

  async put(key: string, value: string): Promise<void> {
    const salt = this.randomBytes(SALT_BYTES)
    const nonce = this.randomBytes(NONCE_BYTES)
    const cryptoKey = await this.deriveKey(salt)
    const plaintext = new TextEncoder().encode(value)
    let ciphertext: ArrayBuffer
    try {
      ciphertext = await this.subtle.encrypt(
        { name: 'AES-GCM', iv: bufOf(nonce) },
        cryptoKey,
        bufOf(plaintext),
      )
    } catch (e) {
      throw new SecureStoreError('BACKEND_FAILURE', `encrypt failed: ${(e as Error).message}`)
    }
    const env: Envelope = {
      v: 1,
      salt: toB64(salt),
      nonce: toB64(nonce),
      ciphertext: toB64(new Uint8Array(ciphertext)),
    }
    try {
      this.storage.setItem(this.storageKey(key), JSON.stringify(env))
    } catch (e) {
      throw new SecureStoreError('BACKEND_FAILURE', `storage write failed: ${(e as Error).message}`)
    }
  }

  async get(key: string): Promise<string | null> {
    const raw = this.storage.getItem(this.storageKey(key))
    if (!raw) return null
    let env: Envelope
    try {
      env = JSON.parse(raw) as Envelope
    } catch {
      throw new SecureStoreError('CORRUPT_ENVELOPE', `key ${key}: not valid JSON`)
    }
    if (!env || env.v !== 1 || typeof env.salt !== 'string' || typeof env.nonce !== 'string' || typeof env.ciphertext !== 'string') {
      throw new SecureStoreError('CORRUPT_ENVELOPE', `key ${key}: missing envelope fields`)
    }
    let salt: Uint8Array, nonce: Uint8Array, ct: Uint8Array
    try {
      salt = fromB64(env.salt)
      nonce = fromB64(env.nonce)
      ct = fromB64(env.ciphertext)
    } catch {
      throw new SecureStoreError('CORRUPT_ENVELOPE', `key ${key}: base64 decode failed`)
    }
    const cryptoKey = await this.deriveKey(salt)
    let pt: ArrayBuffer
    try {
      pt = await this.subtle.decrypt(
        { name: 'AES-GCM', iv: bufOf(nonce) },
        cryptoKey,
        bufOf(ct),
      )
    } catch {
      throw new SecureStoreError('DECRYPT_FAILED', `key ${key}: decryption failed (wrong password or tampered payload)`)
    }
    return new TextDecoder().decode(pt)
  }

  async delete(key: string): Promise<void> {
    try {
      this.storage.removeItem(this.storageKey(key))
    } catch (e) {
      throw new SecureStoreError('BACKEND_FAILURE', `storage delete failed: ${(e as Error).message}`)
    }
  }
}
