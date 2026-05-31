import { type EncryptedStore, SecureStoreError } from './secure-store'

export type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>

export interface TauriEncryptedStoreOptions {
  /** Service name passed to the OS keychain. */
  service?: string
  /** Bound to the running Tauri runtime — pass `invoke` from `@tauri-apps/api/core`. */
  invoke: TauriInvoke
}

/**
 * Tauri-backed encrypted store. Defers entirely to the OS keychain via
 * three commands implemented in Rust (see apps/desktop/src-tauri):
 *
 *   keychain_set    { service, key, value }   → void
 *   keychain_get    { service, key }          → string | null
 *   keychain_delete { service, key }          → void
 *
 * No master password prompt: trust is rooted in the OS user session.
 */
export class TauriEncryptedStore implements EncryptedStore {
  private readonly invoke: TauriInvoke
  private readonly service: string

  constructor(opts: TauriEncryptedStoreOptions) {
    if (!opts.invoke) {
      throw new SecureStoreError('BACKEND_FAILURE', 'tauri invoke fn not provided')
    }
    this.invoke = opts.invoke
    this.service = opts.service ?? 'io.reddb.red-ui'
  }

  async put(key: string, value: string): Promise<void> {
    try {
      await this.invoke<void>('keychain_set', { service: this.service, key, value })
    } catch (e) {
      throw new SecureStoreError('BACKEND_FAILURE', `keychain_set failed: ${stringifyError(e)}`)
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const v = await this.invoke<string | null>('keychain_get', { service: this.service, key })
      return v ?? null
    } catch (e) {
      throw new SecureStoreError('BACKEND_FAILURE', `keychain_get failed: ${stringifyError(e)}`)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.invoke<void>('keychain_delete', { service: this.service, key })
    } catch (e) {
      throw new SecureStoreError('BACKEND_FAILURE', `keychain_delete failed: ${stringifyError(e)}`)
    }
  }
}

function stringifyError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}
