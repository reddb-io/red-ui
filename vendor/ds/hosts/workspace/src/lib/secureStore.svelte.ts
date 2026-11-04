// Optional device-local credentials use the supplied RedDB Vault. Its unlock
// never gates the active remote session. Legacy keychain/WebEncryptedStore
// backends remain available to embedded hosts and as migration sources.

import {
  TauriEncryptedStore,
  WebEncryptedStore,
  SecureStoreError,
  type EncryptedStore,
} from "./reddb/index";
import { bootGateLocked, detectSurface, type Surface } from "./surface";
import { legacyConnectionMigration } from "./local-connections.svelte";
import type { WorkspacePersistence } from "./workspace-persistence";
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
  private readonly onWipe?: () => void;
  private readonly persistence?: WorkspacePersistence;
  private readonly historyKey: string;
  readonly ready: Promise<void>;
  dialogOpen = $state(false);
  unlocking = $state(false);
  available = $state(false);
  get requiresUnlock() { return this.backend !== "reddb" && this.locked; }
  /** The active backend, or null when locked. */
  store = $state<EncryptedStore | null>(null);
  /** True when the user must authenticate before the store can be used. */
  locked = $state<boolean>(true);
  /** True on the first ever launch — UI should ask for a *new* password (with confirm). */
  needsSetup = $state<boolean>(false);
  /** Backend kind, for the UI to skip the password prompt entirely on desktop. */
  backend = $state<"tauri" | "web" | "reddb" | "unknown">("unknown");
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
      onWipe?: () => void;
      persistence?: WorkspacePersistence;
      persistenceReady?: Promise<void>;
      historyKey?: string;
    } = {}
  ) {
    this.onWipe = options.onWipe;
    this.persistence = options.persistence;
    this.historyKey = options.historyKey ?? "red-ui:history";
    this.ready = Promise.resolve();
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
    if (options.persistence) {
      this.backend = "reddb";
      this.ready = (options.persistenceReady ?? Promise.resolve()).then(() => this.bindPersistence());
      return;
    }
    if (this.surface === "standalone") {
      // Tauri desktop — defer to the OS keychain, which unlocks the vault.
      this.backend = "tauri";
      this.bindTauri();
      return;
    }
    // embedded or web. Neither Surface restores credential secrets from
    // durable storage: embedded persists nothing; web history is labels only.
    this.backend = "web";
    const hasSecret = envelopesExist(this.namespace, this.storage);
    this.needsSetup = false;
    this.locked = bootGateLocked(this.surface, hasSecret);
  }

  private async bindPersistence() {
    try {
      const status = await this.persistence!.vault.status();
      if (this.disposed) return;
      this.available = true;
      this.needsSetup = !status.initialized && !envelopesExist(this.namespace, this.storage);
      this.locked = status.locked;
      if (!status.locked && this.surface === "standalone") {
        try { await this.migrateDesktopHistory(); }
        catch { this.error = "Some saved connections could not be migrated. Original keychain records were kept."; }
      }
      this.store = status.locked ? null : this.persistence!.vault;
    } catch {
      this.available = false;
      this.error = "Credential saving is unavailable. You can keep using this connection in the current tab.";
    }
  }

  private legacyLabels(): { id: string; label: string }[] {
    try {
      const value = JSON.parse(this.storage?.getItem(this.historyKey) ?? "[]");
      return Array.isArray(value) ? value.filter(row => row && typeof row.id === "string" && typeof row.label === "string") : [];
    } catch { return []; }
  }

  private async commitLegacyMigration(migration: ReturnType<typeof legacyConnectionMigration>, marker: string) {
    const current = await this.persistence!.read();
    if (current[marker]) return;
    const metadata = Object.fromEntries(Object.entries(migration.metadata).filter(([key]) => current[key] === undefined));
    const secrets: Record<string, string> = {};
    for (const [key, value] of Object.entries(migration.secrets)) {
      // A retry after a crash must preserve a credential updated in a newer tab.
      if (await this.persistence!.vault.get(key) === null) secrets[key] = value;
    }
    await this.persistence!.commit(metadata, secrets, { ifAbsent: true });
    const verified = await this.persistence!.read();
    if (Object.entries(metadata).some(([key, value]) => verified[key] !== value)) {
      throw new Error("Credential migration metadata could not be verified. Originals were kept.");
    }
    for (const [key, value] of Object.entries(secrets)) {
      if (await this.persistence!.vault.get(key) !== value) throw new Error("Credential migration could not be verified. Originals were kept.");
    }
    await this.persistence!.commit({ [marker]: "complete" });
  }

  private async migrateDesktopHistory() {
    if ((await this.persistence!.read()).__legacy_desktop_vault_v1) return;
    const mod = await import("@tauri-apps/api/core");
    const legacy = new TauriEncryptedStore({ invoke: mod.invoke, service: this.namespace === NAMESPACE ? undefined : this.namespace });
    const labels = this.legacyLabels();
    const entries: Record<string, string> = {};
    for (const label of labels) {
      const key = `history:${label.id}`;
      const value = await legacy.get(key);
      if (value !== null) entries[key] = value;
    }
    const migration = legacyConnectionMigration(entries, labels);
    await this.commitLegacyMigration(migration, "__legacy_desktop_vault_v1");
  }

  requestUnlock() {
    if (this.surface === "standalone" && this.persistence) {
      if (this.unlocking) return;
      this.unlocking = true;
      void this.unlockPersistence("").finally(() => { this.unlocking = false; });
      return;
    }
    this.dialogOpen = true;
  }

  private async unlockPersistence(password: string): Promise<boolean> {
    let unlocked = false;
    try {
      const secrets: Record<string, string> = {};
      // Decrypt every legacy envelope before initializing the destination.
      // A wrong legacy password must not create a replacement Vault.
      if (!(await this.persistence!.read()).__legacy_web_vault_v1 && this.storage && envelopesExist(this.namespace, this.storage)) {
        const legacy = new WebEncryptedStore(password, { namespace: this.namespace, storage: this.storage });
        for (let index = 0; index < this.storage.length; index++) {
          const key = this.storage.key(index);
          if (!key?.startsWith(this.namespace + ":")) continue;
          const name = key.slice(this.namespace.length + 1);
          const value = await legacy.get(name);
          if (value !== null) secrets[name] = value;
        }
      }
      const status = await this.persistence!.vault.status();
      await this.persistence!.vault.unlock(password, { create: !status.initialized });
      unlocked = true;
      if (Object.keys(secrets).length) {
        const migration = legacyConnectionMigration(secrets, this.legacyLabels());
        await this.commitLegacyMigration(migration, "__legacy_web_vault_v1");
      }
      if (this.surface === "standalone") await this.migrateDesktopHistory();
      if (this.disposed) { await this.persistence!.vault.lock(); return false; }
      this.store = this.persistence!.vault;
      this.locked = false;
      this.needsSetup = false;
      this.dialogOpen = false;
      return true;
    } catch (error) {
      // Migration can fail after deriving the key. A failed unlock must leave
      // the backend locked as well as the UI, with the originals untouched.
      if (unlocked) {
        this.store = null;
        this.locked = true;
        try { await this.persistence!.vault.lock(); } catch { /* Preserve the migration failure. */ }
      }
      this.error = this.surface === "standalone" && typeof (error as Error)?.message === "string"
        ? (error as Error).message
        : (error as { code?: string }).code === "VAULT_AUTHENTICATION_FAILED"
        ? "Wrong password or damaged Vault. Your saved credentials were kept."
        : "Could not unlock the local Vault. Check your password and try again.";
      return false;
    }
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
    if (this.persistence) return this.unlockPersistence(password);
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

  async lock() {
    this.store = null;
    if (this.persistence) {
      this.locked = true;
      await this.persistence.vault.lock();
      return;
    }
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
    if (this.persistence) { this.error = "Remove saved connections individually from this device."; return; }
    this.onWipe?.();
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
