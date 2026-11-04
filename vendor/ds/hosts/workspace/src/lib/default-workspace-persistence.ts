import type { WorkspacePersistence } from "./workspace-persistence";
import type { Surface } from "./surface";

/** Optional host engines are loaded only for a persisted standalone mount. */
export function createDefaultWorkspacePersistence(profile: string, surface: Surface): WorkspacePersistence {
  let backend: Promise<WorkspacePersistence> | undefined;
  const get = () => backend ??= surface === "standalone"
    ? import("./tauri-workspace-persistence").then(module => module.createTauriWorkspacePersistence(profile))
    : import("./reddb-workspace-persistence").then(module => module.createBrowserWorkspacePersistence(profile));
  return {
    read: async () => (await get()).read(),
    commit: async (metadata, secrets, options) => (await get()).commit(metadata, secrets, options),
    vault: {
      status: async () => (await get()).vault.status(),
      unlock: async (password, options) => (await get()).vault.unlock(password, options),
      lock: async () => (await get()).vault.lock(),
      keys: async () => (await get()).vault.keys(),
      get: async key => (await get()).vault.get(key),
      put: async (key, value) => (await get()).vault.put(key, value),
      delete: async key => (await get()).vault.delete(key),
    },
    dispose: async () => { if (backend) await (await backend).dispose(); },
  };
}
