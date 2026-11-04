import { invoke } from "@tauri-apps/api/core";
import type { MetadataChanges, WorkspacePersistence } from "./workspace-persistence";

/** The private binary, credential and loopback address are owned by Tauri.
 * No endpoint or token is exposed as a user database connection. */
export function createTauriWorkspacePersistence(profile: string): WorkspacePersistence {
  const owner = crypto.randomUUID();
  let closed = false;
  let operations = Promise.resolve();
  const call = <T>(method: string, params: Record<string, unknown> = {}): Promise<T> => {
    if (closed) return Promise.reject(new Error("Workspace persistence is closed"));
    const operation = operations.catch(() => {}).then(() => invoke<T>("workspace_persistence", { profile, owner, method, params }));
    operations = operation.then(() => {}, () => {});
    return operation;
  };
  const commit = (metadata: MetadataChanges, secrets: MetadataChanges = {}, options: { ifAbsent?: boolean } = {}) => call<void>("commit", { metadata, secrets, ifAbsent: options.ifAbsent ?? false });
  return {
    read: () => call<Record<string, string>>("read"),
    commit,
    vault: {
      status: () => call("vaultStatus"),
      unlock: () => call("vaultUnlock"),
      lock: () => call("vaultLock"),
      keys: () => call("vaultKeys"),
      get: key => call("vaultReveal", { name: key }),
      put: (key, value) => commit({}, { [key]: value }),
      delete: key => commit({}, { [key]: null }),
    },
    async dispose() {
      closed = true;
      await operations;
      await invoke("workspace_persistence", { profile, owner, method: "close", params: {} });
    },
  };
}
