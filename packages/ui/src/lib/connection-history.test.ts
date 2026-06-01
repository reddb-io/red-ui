import { describe, expect, it, vi } from "vitest";
import type { EncryptedStore } from "#reddb";
import {
  SurfaceHistoryStore,
  credentialPersistenceForSurface,
  type KeyValueStorage,
} from "./connection-history";

class MemStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  dump() {
    return Array.from(this.map.entries());
  }
}

class FakeVault implements EncryptedStore {
  values = new Map<string, string>();
  put = vi.fn(async (key: string, value: string) => {
    this.values.set(key, value);
  });
  get = vi.fn(async (key: string) => this.values.get(key) ?? null);
  delete = vi.fn(async (key: string) => {
    this.values.delete(key);
  });
}

describe("credentialPersistenceForSurface", () => {
  it("maps surfaces to the required persistence rule", () => {
    expect(credentialPersistenceForSurface("web")).toBe("labels-only");
    expect(credentialPersistenceForSurface("web", true)).toBe("none");
    expect(credentialPersistenceForSurface("standalone")).toBe("vault");
    expect(credentialPersistenceForSurface("embedded")).toBe("none");
  });
});

describe("SurfaceHistoryStore", () => {
  it("web persists only the target label and keeps the secret URL session-only", () => {
    const storage = new MemStorage();
    const vault = new FakeVault();
    const history = new SurfaceHistoryStore({
      surface: () => "web",
      secureStore: () => vault,
      storage,
    });

    history.save([
      {
        url: "http://admin:super-secret@db.local:5055",
        label: "db.local:5055",
        last_used: 1,
        rtt_ms: 7,
      },
    ]);

    const rawStorage = JSON.stringify(storage.dump());
    expect(rawStorage).toContain("db.local:5055");
    expect(rawStorage).not.toContain("super-secret");
    expect(vault.put).not.toHaveBeenCalled();
    expect(history.uiEntries()[0]).toMatchObject({
      label: "db.local:5055",
      url: "http://admin:super-secret@db.local:5055",
    });

    const afterReload = new SurfaceHistoryStore({
      surface: () => "web",
      secureStore: () => vault,
      storage,
    });
    expect(afterReload.uiEntries()[0]).toMatchObject({
      label: "db.local:5055",
      url: undefined,
    });
  });

  it("standalone persists credential URLs through the vault", async () => {
    const storage = new MemStorage();
    const vault = new FakeVault();
    const history = new SurfaceHistoryStore({
      surface: () => "standalone",
      secureStore: () => vault,
      storage,
    });

    history.save([
      {
        url: "http://admin:super-secret@db.local:5055",
        label: "db.local:5055",
        last_used: 1,
      },
    ]);
    await Promise.resolve();

    expect(JSON.stringify(storage.dump())).not.toContain("super-secret");
    expect(Array.from(vault.values.values())).toContain(
      "http://admin:super-secret@db.local:5055"
    );

    const afterRestart = new SurfaceHistoryStore({
      surface: () => "standalone",
      secureStore: () => vault,
      storage,
    });
    await afterRestart.hydrate();
    expect(afterRestart.uiEntries()[0].url).toBe(
      "http://admin:super-secret@db.local:5055"
    );
  });

  it("embedded persists nothing", () => {
    const storage = new MemStorage();
    const vault = new FakeVault();
    const history = new SurfaceHistoryStore({
      surface: () => "embedded",
      secureStore: () => vault,
      storage,
    });

    history.save([
      {
        url: "http://admin:secret@db.local:5055",
        label: "db.local:5055",
        last_used: 1,
      },
    ]);

    expect(storage.dump()).toEqual([]);
    expect(vault.put).not.toHaveBeenCalled();
    expect(history.uiEntries()).toEqual([]);
  });

  it("managed web targets persist nothing", () => {
    const storage = new MemStorage();
    const vault = new FakeVault();
    const history = new SurfaceHistoryStore({
      surface: () => "web",
      secureStore: () => vault,
      managedWebTarget: () => true,
      storage,
    });

    history.save([
      {
        url: "http://admin:secret@managed.local:5055",
        label: "managed.local:5055",
        last_used: 1,
      },
    ]);

    expect(storage.dump()).toEqual([]);
    expect(vault.put).not.toHaveBeenCalled();
    expect(history.uiEntries()).toEqual([]);
  });
});
