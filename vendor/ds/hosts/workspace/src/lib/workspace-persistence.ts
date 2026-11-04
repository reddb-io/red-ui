import type { EncryptedStore } from "./reddb/secure-store";
import type { KeyValueStorage } from "./connection-history";
import { MemoryStorage } from "./workspace-storage";

export type MetadataChanges = Record<string, string | null>;

/** Asynchronous, profile-private persistence. Implementations own transactions,
 * file locking and key lifetime. This is independent of user query connections. */
export interface WorkspacePersistence {
  read(): Promise<Record<string, string>>;
  /** Metadata and secrets commit atomically; null deletes. ifAbsent preserves
   * existing values inside that same transaction, for migration retries. */
  commit(metadata: MetadataChanges, secrets?: MetadataChanges, options?: { ifAbsent?: boolean }): Promise<void>;
  readonly vault: EncryptedStore & {
    status(): Promise<{ initialized: boolean; locked: boolean }>;
    unlock(password: string, options?: { create?: boolean }): Promise<void>;
    lock(): Promise<void>;
    keys(): Promise<string[]>;
  };
  dispose(): Promise<void>;
}

export type PersistenceState = "loading" | "pending" | "saved" | "error" | "legacy";

/** A synchronous view of metadata for existing stores, backed by an explicit
 * asynchronous commit queue. Callers await ready before restoring documents.
 * The tab journal contains metadata only, never Vault values or passwords. */
export class WorkspaceMetadataStorage extends MemoryStorage {
  readonly ready: Promise<void>;
  private pending: MetadataChanges = {};
  private queue = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private initialized = false;
  private initializationFailed = false;
  private readonly journalKey: string;
  state: PersistenceState = "loading";
  error: string | null = null;

  constructor(private readonly options: {
    persistence: WorkspacePersistence;
    profile: string;
    legacy: KeyValueStorage;
    journal: KeyValueStorage;
    owns: (key: string) => boolean;
    accepts: (key: string, value: string) => boolean;
    releaseJournalSpace?: () => void;
    onState?: (state: PersistenceState, error: string | null) => void;
  }) {
    super();
    this.journalKey = `red-ui:journal:${encodeURIComponent(options.profile)}:v1`;
    for (let index = 0; index < options.legacy.length; index++) {
      const key = options.legacy.key(index);
      if (!key) continue;
      const value = options.legacy.getItem(key);
      if (value !== null && options.accepts(key, value)) super.setItem(key, value);
    }
    try {
      const journal = JSON.parse(options.journal.getItem(this.journalKey) ?? "null");
      if (journal?.version === 1 && journal.changes && typeof journal.changes === "object") {
        for (const [key, value] of Object.entries(journal.changes)) {
          if (options.owns(key) && (value === null || typeof value === "string" && options.accepts(key, value))) {
            this.pending[key] = value as string | null;
          }
        }
      }
    } catch { /* Ignore an invalid journal without changing the database. */ }
    this.ready = this.initialize();
  }

  private setState(state: PersistenceState, error: string | null = null) {
    this.state = state;
    this.error = error;
    this.options.onState?.(state, error);
  }

  private async initialize() {
    try {
      const saved = await this.options.persistence.read();
      if (this.disposed) return;
      // An empty destination imports legacy metadata. Keep the source until
      // commit and readback succeed; retries are idempotent by metadata key.
      if (!Object.keys(saved).length) {
        const migrated: MetadataChanges = {};
        for (let index = 0; index < this.length; index++) {
          const key = this.key(index)!;
          migrated[key] = this.getItem(key);
        }
        {
          await this.options.persistence.commit(migrated, {}, { ifAbsent: true });
          const verified = await this.options.persistence.read();
          if (Object.entries(migrated).some(([key, value]) => verified[key] !== value)) {
            throw new Error("Local workspace migration could not be verified. Original data was kept.");
          }
        }
      } else {
        for (let index = this.length - 1; index >= 0; index--) super.removeItem(this.key(index)!);
        for (const [key, value] of Object.entries(saved)) {
          if (this.options.accepts(key, value)) super.setItem(key, value);
        }
      }
      for (const [key, value] of Object.entries(this.pending)) {
        if (value === null) super.removeItem(key); else super.setItem(key, value);
      }
      this.initialized = true;
      await this.flush();
    } catch (error) {
      for (const [key, value] of Object.entries(this.pending)) {
        if (value === null) super.removeItem(key); else super.setItem(key, value);
      }
      this.initializationFailed = true;
      const code = (error as { code?: string })?.code;
      // Only lack of platform capability permits legacy fallback. Corruption,
      // quota and Worker errors never initialize over an existing database.
      if (code === "STORAGE_UNSUPPORTED") this.setState("legacy");
      else this.setState("error", "Local workspace could not be saved. Your previous data was kept.");
    }
  }

  override setItem(key: string, value: string) {
    if (!this.options.accepts(key, value)) throw new Error("This value is not workspace metadata");
    if (this.getItem(key) === value) return;
    super.setItem(key, value);
    this.change(key, value);
  }

  override removeItem(key: string) {
    if (!this.options.owns(key)) throw new Error("This key belongs to another workspace store");
    super.removeItem(key);
    this.change(key, null);
  }

  private change(key: string, value: string | null) {
    if (this.disposed) return;
    if (this.state === "legacy") {
      if (value === null) this.options.legacy.removeItem(key);
      else this.options.legacy.setItem(key, value);
      return;
    }
    this.pending[key] = value;
    const journaled = this.writeJournal();
    this.setState(this.initializationFailed || !journaled ? "error" : "pending",
      this.initializationFailed ? "Local workspace recovery failed. Reload to retry before saving."
      : !journaled ? "Reload recovery is unavailable until the local commit completes." : null);
    clearTimeout(this.timer);
    if (this.initialized) this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, 100);
  }

  private writeJournal(): boolean {
    const write = () => {
      if (!Object.keys(this.pending).length) this.options.journal.removeItem(this.journalKey);
      else this.options.journal.setItem(this.journalKey, JSON.stringify({ version: 1, changes: this.pending }));
    };
    try { write(); return true; }
    catch {
      // A large tab-only result cache must not displace document recovery.
      // Release only this workspace's result snapshot, never another profile.
      try { this.options.releaseJournalSpace?.(); write(); return true; }
      catch {
        try { this.options.journal.removeItem(this.journalKey); } catch { /* Restricted storage. */ }
        return false;
      }
    }
  }

  /** Acknowledges saved only after the real database transaction completes. */
  flush(): Promise<void> {
    clearTimeout(this.timer);
    this.queue = this.queue.catch(() => {}).then(async () => {
      if (this.state === "legacy") return;
      if (this.initializationFailed) throw new Error("Reload to retry workspace recovery before saving");
      if (!this.initialized) return;
      const batch = { ...this.pending };
      if (!Object.keys(batch).length) { this.setState("saved"); return; }
      try {
        await this.options.persistence.commit(batch);
        for (const [key, value] of Object.entries(batch)) {
          if (this.pending[key] === value) delete this.pending[key];
        }
        this.writeJournal();
        this.setState(Object.keys(this.pending).length ? "pending" : "saved");
      } catch (error) {
        this.setState("error", "Local workspace could not be saved. Retry to keep your changes.");
        throw error;
      }
    });
    return this.queue;
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    void this.ready.then(() => this.flush()).catch(() => {}).finally(() => this.options.persistence.dispose()).catch(() => {});
  }
}
