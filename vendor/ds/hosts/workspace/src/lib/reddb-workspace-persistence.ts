import type { Database, DatabaseSession } from "@reddb-io/browser";
import type { MetadataChanges, WorkspacePersistence } from "./workspace-persistence";

/** Browser-only local file broker. The outer lock queues tabs; the SDK's inner
 * file lock remains the final owner fence. A Worker stays warm between owners. */
export function createBrowserWorkspacePersistence(profile: string): WorkspacePersistence {
  const fileName = () => crypto.subtle.digest("SHA-256", new TextEncoder().encode(profile)).then(bytes =>
    `red-ui-${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("")}`);
  let session: Promise<DatabaseSession> | undefined;
  let closed = false;
  let operations = Promise.resolve();

  function operation<T>(run: (database: Database) => Promise<T>): Promise<T> {
    if (closed) return Promise.reject(new Error("Workspace persistence is closed"));
    const next = operations.catch(() => {}).then(async () => {
      if (typeof navigator === "undefined" || !navigator.storage?.getDirectory || !navigator.locks?.request || typeof Worker === "undefined" || !globalThis.crypto?.subtle) {
        throw Object.assign(new Error("This browser does not support local RedDB persistence"), { code: "STORAGE_UNSUPPORTED" });
      }
      const name = await fileName();
      return navigator.locks.request(`red-ui:workspace:${name}`, async () => {
        session ??= import("@reddb-io/browser").then(module => module.createDatabaseSession());
        const owner = await session;
        const database = await owner.openDatabase({ name, create: true });
        try {
          if (!(await database.info()).capabilities.localVault) throw new Error("The RedDB runtime does not support local Vaults");
          await database.query("CREATE TABLE IF NOT EXISTS workspace_metadata (entry_key TEXT PRIMARY KEY, entry_value TEXT NOT NULL)");
          return await run(database);
        } finally { await database.close(); }
      });
    });
    operations = next.then(() => {}, () => {});
    return next;
  }

  const commit = (metadata: MetadataChanges, secrets: MetadataChanges = {}, options: { ifAbsent?: boolean } = {}) => operation(async database => {
    await database.query("BEGIN");
    try {
      for (const [key, value] of Object.entries({ ...metadata, __workspace_migration_v1: "complete" })) {
        if (options.ifAbsent && (await database.query("SELECT entry_key FROM workspace_metadata WHERE entry_key = $1", [key])).rows.length) continue;
        await database.query("DELETE FROM workspace_metadata WHERE entry_key = $1", [key]);
        if (value !== null) await database.query("INSERT INTO workspace_metadata VALUES ($1, $2)", [key, value]);
      }
      for (const [key, value] of Object.entries(secrets)) {
        if (options.ifAbsent && await database.vault.reveal(key) !== null) continue;
        if (value === null) await database.vault.delete(key); else await database.vault.put(key, value);
      }
      await database.query("COMMIT");
    } catch (error) {
      try { await database.query("ROLLBACK"); } catch { /* Preserve the original failure. */ }
      throw error;
    }
  });

  return {
    read: () => operation(async database => {
      const result = await database.query("SELECT entry_key, entry_value FROM workspace_metadata");
      return Object.fromEntries(result.rows as [string, string][]);
    }),
    commit,
    vault: {
      status: () => operation(database => database.vault.status()),
      unlock: (password, options) => operation(database => database.vault.unlock(password, options)),
      lock: () => operation(database => database.vault.lock()),
      keys: () => operation(database => database.vault.keys()),
      get: name => operation(database => database.vault.reveal(name)),
      put: (name, value) => commit({}, { [name]: value }),
      delete: name => commit({}, { [name]: null }),
    },
    async dispose() {
      closed = true;
      await operations;
      if (session) await (await session).close();
    },
  };
}
