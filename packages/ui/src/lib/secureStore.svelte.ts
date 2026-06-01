// Session-scoped secure-store service. Picks a backend at runtime:
//   - Tauri: defer entirely to the OS keychain (no master password prompt).
//   - Web:   prompt for a master password once per session, then use
//            the PBKDF2/AES-GCM WebEncryptedStore over localStorage.
//
// The store is exposed reactively so the workspace shell can render
// the lock dialog when `locked` is true, and the connect dropdown can
// hydrate history URLs the moment `store` becomes non-null.

import {
  TauriEncryptedStore,
  WebEncryptedStore,
  SecureStoreError,
  type EncryptedStore,
} from '#reddb'
import { bootGateLocked, detectSurface, type Surface } from './surface'

const NAMESPACE = 'red-ui:secure'
const PROBE_KEY = '__probe__'
const PROBE_VALUE = 'ok'

function envelopesExist(): boolean {
  if (typeof localStorage === 'undefined') return false
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(NAMESPACE + ':')) return true
  }
  return false
}

class SecureStoreSvc {
  /** The active backend, or null when locked. */
  store = $state<EncryptedStore | null>(null)
  /** True when the user must authenticate before the store can be used. */
  locked = $state<boolean>(true)
  /** True on the first ever launch — UI should ask for a *new* password (with confirm). */
  needsSetup = $state<boolean>(false)
  /** Backend kind, for the UI to skip the password prompt entirely on desktop. */
  backend = $state<'tauri' | 'web' | 'unknown'>('unknown')
  /** The detected Surface (#21) — drives the Surface-aware boot gate. */
  surface = $state<Surface>('web')
  /** Last unlock attempt error, surface-able to the dialog. */
  error = $state<string | null>(null)

  constructor() {
    if (typeof window === 'undefined') {
      this.backend = 'unknown'
      return
    }
    this.surface = detectSurface()
    if (this.surface === 'standalone') {
      // Tauri desktop — defer to the OS keychain, which unlocks the vault.
      this.backend = 'tauri'
      this.bindTauri()
      return
    }
    // embedded or web. A credential-less embedded Surface boots straight to
    // data; web gates on the master password ONLY when there is a secret to
    // decrypt (#21) — a fresh web user with nothing saved is not blocked.
    this.backend = 'web'
    const hasSecret = envelopesExist()
    this.needsSetup = !hasSecret
    this.locked = bootGateLocked(this.surface, hasSecret)
  }

  private async bindTauri() {
    try {
      const mod = await import('@tauri-apps/api/core')
      this.store = new TauriEncryptedStore({ invoke: mod.invoke })
      this.locked = false
    } catch (e) {
      this.error = `Tauri keychain bridge unavailable: ${(e as Error).message}`
    }
  }

  /**
   * Unlock the web store with a master password.
   *
   * - If a probe envelope already exists, verifying it confirms the password.
   * - If no probe exists yet (first launch), writes one as the canary.
   *
   * Returns true on success, false on wrong-password (with `error` populated).
   */
  async unlock(password: string): Promise<boolean> {
    this.error = null
    if (this.backend !== 'web') return true
    let candidate: WebEncryptedStore
    try {
      candidate = new WebEncryptedStore(password, { namespace: NAMESPACE })
    } catch (e) {
      this.error = (e as Error).message
      return false
    }
    try {
      const existing = await candidate.get(PROBE_KEY)
      if (existing === null) {
        await candidate.put(PROBE_KEY, PROBE_VALUE)
      } else if (existing !== PROBE_VALUE) {
        this.error = 'Wrong password'
        return false
      }
    } catch (e) {
      if (e instanceof SecureStoreError && e.code === 'DECRYPT_FAILED') {
        this.error = 'Wrong password'
        return false
      }
      this.error = (e as Error).message
      return false
    }
    this.store = candidate
    this.locked = false
    this.needsSetup = false
    return true
  }

  lock() {
    this.store = null
    if (this.backend === 'web') this.locked = true
  }

  /**
   * Nuclear option: wipe every red-ui artifact from this browser and
   * return to a clean "new install" state. Removes the encrypted
   * envelopes (`red-ui:secure:*`), the active-connection pin
   * (`red-ui:connection`), the history labels (`red-ui:history`), and
   * the theme preference (`red-ui:theme`) — everything else is in-memory
   * only and resets when the page reloads.
   */
  wipe() {
    if (typeof localStorage === 'undefined') return
    const drop: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith(NAMESPACE + ':')) drop.push(k)
      else if (k.startsWith('red-ui:')) drop.push(k)
    }
    for (const k of drop) localStorage.removeItem(k)
    this.store = null
    if (this.backend === 'web') {
      this.locked = true
      this.needsSetup = true
    }
    this.error = null
  }
}

export const secureStore = new SecureStoreSvc()
