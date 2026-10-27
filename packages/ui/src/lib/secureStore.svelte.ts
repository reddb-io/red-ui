// Session-scoped secure-store service. Picks a backend at runtime:
//   - Tauri: defer entirely to the OS keychain (no master password prompt).
//   - Web:   no credential vault; target secrets are session-only. The
//            WebEncryptedStore path is retained for legacy/manual unlocks.
//
// The store is exposed reactively so the workspace shell can render
// the lock dialog when `locked` is true, and standalone can hydrate history
// URLs the moment `store` becomes non-null.

import {
  TauriEncryptedStore,
  WebEncryptedStore,
  SecureStoreError,
  type EncryptedStore,
} from "#reddb";
import { bootGateLocked, detectSurface, type Surface } from "./surface";
import type { KeyValueStorage } from "./connection-history";

const NAMESPACE = "red-ui:secure";
const PROBE_KEY = "__probe__";
const PROBE_VALUE = "ok";

function envelopesExist(namespace: string, storage?: KeyValueStorage): boolean {
  if (!storage) return false;
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(namespace + ":")) return true;
  }
  return false;
}

export class SecureStoreSvc {
  private readonly namespace: string;
  private readonly storage?: KeyValueStorage;
  private readonly storagePrefix: string;
  private disposed = false;
  /** The active backend, or null when locked. */
  store = $state<EncryptedStore | null>(null);
  /** True when the user must authenticate before the store can be used. */
  locked = $state<boolean>(true);
  /** True on the first ever launch — UI should ask for a *new* password (with confirm). */
  needsSetup = $state<boolean>(false);
  /** Backend kind, for the UI to skip the password prompt entirely on desktop. */
  backend = $state<"tauri" | "web" | "unknown">("unknown");
  /** The detected Surface (#21) — drives the Surface-aware boot gate. */
  surface = $state<Surface>("web");
  /** Last unlock attempt error, surface-able to the dialog. */
  error = $state<string | null>(null);

  constructor(
    options: {
      surface?: Surface;
      namespace?: string;
      storage?: KeyValueStorage;
      storagePrefix?: string;
    } = {}
  ) {
    this.namespace = options.namespace ?? NAMESPACE;
    this.storage =
      options.storage ??
      (typeof localStorage !== "undefined" ? localStorage : undefined);
    this.storagePrefix = options.storagePrefix ?? "red-ui:";
    if (typeof window === "undefined") {
      this.backend = "unknown";
      return;
    }
    this.surface = options.surface ?? detectSurface();
    if (this.surface === "standalone") {
      // Tauri desktop — defer to the OS keychain, which unlocks the vault.
      this.backend = "tauri";
      this.bindTauri();
      return;
    }
    // embedded or web. Neither Surface restores credential secrets from
    // storage: embedded persists nothing, and web persists target labels only.
    this.backend = "web";
    const hasSecret = envelopesExist(this.namespace, this.storage);
    this.needsSetup = false;
    this.locked = bootGateLocked(this.surface, hasSecret);
  }

  private async bindTauri() {
    try {
      const mod = await import("@tauri-apps/api/core");
      if (this.disposed) return;
      this.store = new TauriEncryptedStore({
        invoke: mod.invoke,
        service: this.namespace === NAMESPACE ? undefined : this.namespace,
      });
      this.locked = false;
    } catch (e) {
      this.error = `Tauri keychain bridge unavailable: ${(e as Error).message}`;
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
    this.error = null;
    if (this.backend !== "web") return true;
    let candidate: WebEncryptedStore;
    try {
      candidate = new WebEncryptedStore(password, {
        namespace: this.namespace,
        storage: this.storage,
      });
    } catch (e) {
      this.error = (e as Error).message;
      return false;
    }
    try {
      const existing = await candidate.get(PROBE_KEY);
      if (existing === null) {
        await candidate.put(PROBE_KEY, PROBE_VALUE);
      } else if (existing !== PROBE_VALUE) {
        this.error = "Wrong password";
        return false;
      }
    } catch (e) {
      if (e instanceof SecureStoreError && e.code === "DECRYPT_FAILED") {
        this.error = "Wrong password";
        return false;
      }
      this.error = (e as Error).message;
      return false;
    }
    if (this.disposed) return false;
    this.store = candidate;
    this.locked = false;
    this.needsSetup = false;
    return true;
  }

  lock() {
    this.store = null;
    if (this.backend === "web")
      this.locked = bootGateLocked(
        this.surface,
        envelopesExist(this.namespace, this.storage)
      );
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
    if (!this.storage) return;
    const drop: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (!k) continue;
      if (k.startsWith(this.namespace + ":")) drop.push(k);
      else if (k.startsWith(this.storagePrefix)) drop.push(k);
    }
    for (const k of drop) this.storage.removeItem(k);
    this.store = null;
    if (this.backend === "web") {
      this.locked = bootGateLocked(this.surface, false);
      this.needsSetup = false;
    }
    this.error = null;
  }

  dispose() {
    this.disposed = true;
    this.store = null;
    this.locked = true;
  }
}

export const secureStore = new SecureStoreSvc();
