/**
 * EncryptedStore — deep module for credential-grade key/value storage.
 *
 * Two implementations are shipped:
 *
 *  - WebEncryptedStore: derives an AES-GCM key from a session-scoped
 *    master password (PBKDF2/SHA-256, 200k iterations) and writes
 *    {ciphertext, nonce, salt} to localStorage.
 *
 *  - TauriEncryptedStore: defers to the OS keychain (Keychain on
 *    macOS, Credential Manager on Windows, libsecret on Linux) via
 *    a tiny set of `invoke` commands implemented in Rust.
 *
 * Both implementations share the same surface, the same error vocabulary,
 * and the same tamper-detection guarantees.
 */

export interface EncryptedStore {
  put(key: string, value: string): Promise<void>
  get(key: string): Promise<string | null>
  delete(key: string): Promise<void>
}

export class SecureStoreError extends Error {
  readonly code: SecureStoreErrorCode
  constructor(code: SecureStoreErrorCode, message: string) {
    super(message)
    this.name = 'SecureStoreError'
    this.code = code
  }
}

export type SecureStoreErrorCode =
  /** Decryption of stored ciphertext failed — wrong key or tampered payload. */
  | 'DECRYPT_FAILED'
  /** Stored envelope is missing required fields or is structurally invalid. */
  | 'CORRUPT_ENVELOPE'
  /** Backing store (localStorage, keychain) refused the operation. */
  | 'BACKEND_FAILURE'
  /** Store accessed before unlock/key derivation. */
  | 'LOCKED'
