import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { MemoryStorage } from "./workspace-storage";
import { SecureStoreSvc } from "./secureStore.svelte";
import { WebEncryptedStore } from "./reddb/index";
import { WorkspaceMetadataStorage, type MetadataChanges, type WorkspacePersistence } from "./workspace-persistence";
import { LocalConnections } from "./local-connections.svelte";

function fixture() {
  const metadata: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  const commits: { metadata: MetadataChanges; secrets: MetadataChanges }[] = [];
  let locked = true;
  let failure: Error | undefined;
  const persistence: WorkspacePersistence = {
    async read() { if (failure) throw failure; return { ...metadata }; },
    async commit(changes, credentials = {}, options = {}) {
      if (failure) throw failure;
      if (locked && Object.keys(credentials).length) throw new Error("VAULT_LOCKED");
      commits.push({ metadata: { ...changes }, secrets: { ...credentials } });
      for (const [key, value] of Object.entries(changes)) {
        if (options.ifAbsent && metadata[key] !== undefined) continue;
        if (value === null) delete metadata[key]; else metadata[key] = value;
      }
      for (const [key, value] of Object.entries(credentials)) {
        if (options.ifAbsent && secrets[key] !== undefined) continue;
        if (value === null) delete secrets[key]; else secrets[key] = value;
      }
      metadata.__workspace_migration_v1 = "complete";
    },
    vault: {
      async status() { return { initialized: true, locked }; },
      async unlock() { locked = false; },
      async lock() { locked = true; },
      async keys() { if (locked) throw new Error("VAULT_LOCKED"); return Object.keys(secrets); },
      async get(key) { if (locked) throw new Error("VAULT_LOCKED"); return secrets[key] ?? null; },
      async put(key, value) { await persistence.commit({}, { [key]: value }); },
      async delete(key) { await persistence.commit({}, { [key]: null }); },
    },
    async dispose() {},
  };
  return { persistence, metadata, secrets, commits, fail(error: Error | undefined) { failure = error; } };
}

function storage(backend: WorkspacePersistence, legacy = new MemoryStorage(), journal = new MemoryStorage(), profile = "default") {
  return new WorkspaceMetadataStorage({ persistence: backend, legacy, journal, profile, owns: key => key === "draft" || key === "theme", accepts: key => key === "draft" || key === "theme" });
}

describe("async workspace recovery", () => {
  it("recovers an immediate reload from metadata intent before the async commit", async () => {
    const backend = fixture();
    const journal = new MemoryStorage();
    const first = storage(backend.persistence, undefined, journal);
    await first.ready;
    first.setItem("draft", "SELECT 'new draft'");
    expect(first.state).toBe("pending");
    expect(journal.getItem(journal.key(0)!)).toContain("new draft");
    const reloaded = storage(backend.persistence, undefined, journal);
    await reloaded.ready;
    expect(reloaded.getItem("draft")).toBe("SELECT 'new draft'");
    expect(backend.metadata.draft).toBe("SELECT 'new draft'");
    expect(reloaded.state).toBe("saved");
    expect(journal.length).toBe(0);
    first.dispose(); reloaded.dispose();
  });

  it("acknowledges saved only after the real commit and preserves intent on quota failure", async () => {
    const backend = fixture();
    const journal = new MemoryStorage();
    const cache = storage(backend.persistence, undefined, journal);
    await cache.ready;
    backend.fail(new Error("quota exceeded"));
    cache.setItem("draft", "pending changes");
    await expect(cache.flush()).rejects.toThrow("quota");
    expect(cache.state).toBe("error");
    expect(journal.length).toBe(1);
    expect(backend.metadata.draft).toBeUndefined();
    backend.fail(undefined);
    await cache.flush();
    expect(cache.state).toBe("saved");
    expect(journal.length).toBe(0);
    cache.dispose();
  });

  it("migrates once, verifies destination reads and retains the original records", async () => {
    const backend = fixture();
    const legacy = new MemoryStorage();
    legacy.setItem("draft", "legacy draft");
    legacy.setItem("secure:admin", "encrypted legacy envelope");
    const cache = storage(backend.persistence, legacy);
    await cache.ready;
    expect(backend.metadata.draft).toBe("legacy draft");
    expect(backend.metadata["secure:admin"]).toBeUndefined();
    expect(legacy.getItem("draft")).toBe("legacy draft");
    cache.removeItem("draft"); await cache.flush();
    const restart = storage(backend.persistence, legacy);
    await restart.ready;
    expect(restart.getItem("draft")).toBeNull();
    expect(legacy.getItem("draft")).toBe("legacy draft");
    cache.dispose(); restart.dispose();
  });

  it("never treats corruption as platform fallback or writes over failed recovery", async () => {
    const backend = fixture();
    const legacy = new MemoryStorage(); legacy.setItem("draft", "safe source");
    backend.fail(Object.assign(new Error("damaged file"), { code: "DATABASE_ERROR" }));
    const cache = storage(backend.persistence, legacy);
    await cache.ready;
    expect(cache.state).toBe("error");
    cache.setItem("draft", "new intent");
    await expect(cache.flush()).rejects.toThrow("recovery");
    expect(backend.commits).toHaveLength(0);
    expect(legacy.getItem("draft")).toBe("safe source");
    cache.dispose();
  });

  it("uses legacy metadata only on browsers without OPFS support and isolates profile journals", async () => {
    const unsupported = fixture();
    unsupported.fail(Object.assign(new Error("OPFS unavailable"), { code: "STORAGE_UNSUPPORTED" }));
    const legacy = new MemoryStorage();
    const fallback = storage(unsupported.persistence, legacy);
    await fallback.ready; fallback.setItem("theme", "dark");
    expect(fallback.state).toBe("legacy");
    expect(legacy.getItem("theme")).toBe("dark");
    const journal = new MemoryStorage();
    const first = storage(fixture().persistence, undefined, journal, "first");
    const second = storage(fixture().persistence, undefined, journal, "second");
    await Promise.all([first.ready, second.ready]);
    first.setItem("draft", "first profile"); second.setItem("draft", "second profile");
    expect(journal.length).toBe(2);
    expect(first.getItem("draft")).toBe("first profile");
    expect(second.getItem("draft")).toBe("second profile");
    fallback.dispose(); first.dispose(); second.dispose();
  });

  it("ignores journal keys owned by another store, including deletions", async () => {
    const backend = fixture();
    backend.metadata["other-profile"] = "preserved";
    const journal = new MemoryStorage();
    journal.setItem("red-ui:journal:default:v1", JSON.stringify({ version: 1, changes: { draft: "recover me", "other-profile": null } }));
    const cache = storage(backend.persistence, undefined, journal);
    await cache.ready;
    expect(backend.metadata["other-profile"]).toBe("preserved");
    expect(cache.getItem("draft")).toBe("recover me");
    expect(() => cache.removeItem("other-profile")).toThrow("another workspace");
    cache.dispose();
  });

  it("retains uncommitted intent when the Worker fails after successful recovery", async () => {
    const backend = fixture();
    const journal = new MemoryStorage();
    const cache = storage(backend.persistence, undefined, journal);
    await cache.ready;
    backend.fail(Object.assign(new Error("Worker terminated"), { code: "WORKER_ERROR" }));
    cache.setItem("draft", "unsaved draft");
    await expect(cache.flush()).rejects.toThrow("Worker terminated");
    expect(cache.state).toBe("error");
    expect(journal.getItem("red-ui:journal:default:v1")).toContain("unsaved draft");
    expect(backend.metadata.draft).toBeUndefined();
    backend.fail(undefined);
    await cache.flush();
    expect(backend.metadata.draft).toBe("unsaved draft");
    cache.dispose();
  });
});

it("saves credentials only on explicit opt-in and commits the reference and secret together", async () => {
  const backend = fixture();
  const profiles = new LocalConnections(backend.persistence);
  await profiles.load();
  expect(backend.commits).toHaveLength(0);
  await expect(profiles.save("https://db.example", "Admin", { token: "private handoff" })).rejects.toThrow("LOCKED");
  expect(backend.metadata).toEqual({});
  await backend.persistence.vault.unlock("master");
  await profiles.save("https://db.example", "Admin", { token: "private handoff" });
  expect(backend.commits).toHaveLength(1);
  expect(JSON.stringify(backend.commits[0].metadata)).not.toContain("private handoff");
  expect(Object.keys(backend.commits[0].secrets)).toEqual([profiles.profiles[0].credentialRef]);
  await backend.persistence.vault.lock();
  await profiles.load();
  expect(profiles.profiles[0].label).toBe("Admin");
  await expect(profiles.credentials(profiles.profiles[0])).rejects.toThrow("LOCKED");
});


it("keeps separate saved identities for two users of the same database", async () => {
  const backend = fixture();
  await backend.persistence.vault.unlock("master");
  const profiles = new LocalConnections(backend.persistence);
  await profiles.save("https://db.example", "Admin", { username: "admin", password: "admin credential" });
  await profiles.save("https://db.example", "Reader", { username: "reader", password: "reader credential" });
  expect(profiles.profiles).toHaveLength(2);
  expect(new Set(profiles.profiles.map(profile => profile.credentialRef)).size).toBe(2);
  expect(JSON.stringify(backend.metadata)).not.toContain("admin credential");
  expect(JSON.stringify(backend.metadata)).not.toContain("reader credential");
});

it("locks the derived backend key if credential migration fails and retains its source", async () => {
  const backend = fixture();
  const legacy = new MemoryStorage();
  const encrypted = new WebEncryptedStore("legacy master", { namespace: "red-ui:secure", storage: legacy });
  await encrypted.put("history:old-admin", "https://admin:legacy-password@db.example");
  const original = legacy.getItem("red-ui:secure:history:old-admin");
  const commit = backend.persistence.commit;
  backend.persistence.commit = async (metadata, secrets, options) => {
    if (Object.keys(secrets ?? {}).length) throw new Error("quota exceeded");
    await commit(metadata, secrets, options);
  };
  vi.stubGlobal("window", {});
  try {
    const secure = new SecureStoreSvc({ surface: "web", storage: legacy, persistence: backend.persistence });
    await secure.ready;
    expect(await secure.unlock("legacy master")).toBe(false);
    expect(secure.locked).toBe(true);
    expect(secure.store).toBeNull();
    expect((await backend.persistence.vault.status()).locked).toBe(true);
    expect(legacy.getItem("red-ui:secure:history:old-admin")).toBe(original);
    expect(backend.metadata.__legacy_web_vault_v1).toBeUndefined();
  } finally { vi.unstubAllGlobals(); }
});
