import type {
  EncryptedStore,
  HistoryEntry as ProtocolHistoryEntry,
  HistoryStore,
} from "#reddb";
import type { Surface } from "./surface";

export type CredentialPersistence = "none" | "labels-only" | "vault";

export interface StoredLabelEntry {
  id: string;
  label: string;
  last_used: number;
  rtt_ms?: number;
}

export interface HistoryEntry {
  id: string;
  label: string;
  last_used: number;
  rtt_ms?: number;
  /** Session/vault-hydrated URL. Absent on web after reload by design. */
  url?: string;
}

export interface KeyValueStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SurfaceHistoryStoreOptions {
  surface: () => Surface;
  secureStore: () => EncryptedStore | null;
  managedWebTarget?: () => boolean;
  storage?: KeyValueStorage;
  historyKey?: string;
  urlPrefix?: string;
}

export const DEFAULT_HISTORY_KEY = "red-ui:history";
export const DEFAULT_URL_PREFIX = "history:";

export function credentialPersistenceForSurface(
  surface: Surface,
  managedWebTarget = false
): CredentialPersistence {
  switch (surface) {
    case "embedded":
      return "none";
    case "standalone":
      return "vault";
    case "web":
      return managedWebTarget ? "none" : "labels-only";
  }
}

export function safeConnectionLabel(entry: {
  label?: string;
  url?: string;
}): string {
  if (entry.url) {
    try {
      const host = new URL(entry.url).host;
      if (host) return host;
    } catch {
      // Fall through to the supplied label.
    }
  }

  const raw = (entry.label ?? entry.url ?? "").trim();
  if (!raw) return "";
  try {
    const host = new URL(raw).host;
    if (host) return host;
  } catch {
    // A label is not necessarily a URL.
  }
  return raw.includes("@") ? raw.slice(raw.lastIndexOf("@") + 1) : raw;
}

function defaultStorage(): KeyValueStorage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function labelHistoryId(label: string): string {
  return `label:${encodeURIComponent(label)}`;
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readLabels(
  storage: KeyValueStorage | undefined,
  historyKey: string
): StoredLabelEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(historyKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      StoredLabelEntry & { url?: string }
    >;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e) => e && typeof e.id === "string" && typeof e.label === "string"
      )
      .map((e) => ({
        id: e.id,
        label: e.label,
        last_used: e.last_used,
        rtt_ms: e.rtt_ms,
      }));
  } catch {
    return [];
  }
}

function writeLabels(
  storage: KeyValueStorage | undefined,
  historyKey: string,
  entries: StoredLabelEntry[]
) {
  if (!storage) return;
  try {
    storage.setItem(historyKey, JSON.stringify(entries));
  } catch {
    /* quota or disabled storage: history is best-effort */
  }
}

/**
 * Surface-aware credential history.
 *
 * - web: labels go to localStorage; URL/credential strings stay in memory only.
 * - standalone: labels go to localStorage; URLs go to the encrypted vault.
 * - embedded/managed web: no history is read or written.
 */
export class SurfaceHistoryStore implements HistoryStore {
  private readonly surface: () => Surface;
  private readonly secureStore: () => EncryptedStore | null;
  private readonly managedWebTarget: () => boolean;
  private readonly storage?: KeyValueStorage;
  private readonly historyKey: string;
  private readonly urlPrefix: string;
  private idByUrl = new Map<string, string>();
  private urlById = new Map<string, string>();
  private onChange?: () => void;

  constructor(opts: SurfaceHistoryStoreOptions) {
    this.surface = opts.surface;
    this.secureStore = opts.secureStore;
    this.managedWebTarget = opts.managedWebTarget ?? (() => false);
    this.storage = opts.storage ?? defaultStorage();
    this.historyKey = opts.historyKey ?? DEFAULT_HISTORY_KEY;
    this.urlPrefix = opts.urlPrefix ?? DEFAULT_URL_PREFIX;
  }

  setOnChange(fn: () => void) {
    this.onChange = fn;
  }

  persistence(): CredentialPersistence {
    return credentialPersistenceForSurface(
      this.surface(),
      this.managedWebTarget()
    );
  }

  load(): ProtocolHistoryEntry[] {
    if (this.persistence() === "none") return [];
    return readLabels(this.storage, this.historyKey).map((l) => ({
      url: this.urlById.get(l.id) ?? "",
      label: l.label,
      last_used: l.last_used,
      rtt_ms: l.rtt_ms,
    }));
  }

  save(entries: ProtocolHistoryEntry[]) {
    const mode = this.persistence();
    if (mode === "none") {
      this.onChange?.();
      return;
    }

    const previous = readLabels(this.storage, this.historyKey);
    const previousByLabel = new Map(previous.map((l) => [l.label, l]));
    const next: StoredLabelEntry[] = [];
    const seen = new Set<string>();
    const seenLabels = new Set<string>();

    for (const e of entries) {
      const label = safeConnectionLabel(e);
      if (!label) continue;

      let id: string | undefined;
      if (e.url) {
        id =
          mode === "labels-only"
            ? labelHistoryId(label)
            : (this.idByUrl.get(e.url) ?? genId());
        this.idByUrl.set(e.url, id);
        this.urlById.set(id, e.url);
      } else {
        id = previousByLabel.get(label)?.id ?? labelHistoryId(label);
      }
      if (seen.has(id) || (!e.url && seenLabels.has(label))) continue;
      seen.add(id);
      seenLabels.add(label);

      next.push({
        id,
        label,
        last_used: typeof e.last_used === "number" ? e.last_used : Date.now(),
        rtt_ms: e.rtt_ms,
      });
    }

    writeLabels(this.storage, this.historyKey, next);

    if (mode === "vault") {
      const store = this.secureStore();
      if (store) {
        for (const row of next) {
          const url = this.urlById.get(row.id);
          if (url) store.put(this.urlPrefix + row.id, url).catch(() => {});
        }
      }
    }

    this.onChange?.();
  }

  uiEntries(): HistoryEntry[] {
    if (this.persistence() === "none") return [];
    return readLabels(this.storage, this.historyKey).map((l) => ({
      id: l.id,
      label: l.label,
      last_used: l.last_used,
      rtt_ms: l.rtt_ms,
      url: this.urlById.get(l.id),
    }));
  }

  async hydrate() {
    if (this.persistence() !== "vault") return;
    const store = this.secureStore();
    if (!store) return;
    const labels = readLabels(this.storage, this.historyKey);
    let changed = false;
    for (const l of labels) {
      if (this.urlById.has(l.id)) continue;
      try {
        const url = await store.get(this.urlPrefix + l.id);
        if (url) {
          this.urlById.set(l.id, url);
          this.idByUrl.set(url, l.id);
          changed = true;
        }
      } catch {
        /* tampered or wrong key: surface as missing URL */
      }
    }
    if (changed) this.onChange?.();
  }

  async forgetById(id: string) {
    if (this.persistence() === "none") {
      this.onChange?.();
      return;
    }
    const labels = readLabels(this.storage, this.historyKey).filter(
      (l) => l.id !== id
    );
    writeLabels(this.storage, this.historyKey, labels);
    const url = this.urlById.get(id);
    if (url) {
      this.urlById.delete(id);
      this.idByUrl.delete(url);
    }
    const store = this.persistence() === "vault" ? this.secureStore() : null;
    if (store) {
      try {
        await store.delete(this.urlPrefix + id);
      } catch {}
    }
    this.onChange?.();
  }

  async forgetByUrl(url: string) {
    const id = this.idByUrl.get(url);
    if (id) await this.forgetById(id);
  }
}
