/** Storage operations required by an independently mounted workspace. */
export interface WorkspaceStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** A private storage backend for mounts that do not opt into persistence. */
export class MemoryStorage implements WorkspaceStorage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

/** Limit enumeration and deletion to a workspace's own persisted keys. */
export function scopedStorage(
  storage: WorkspaceStorage,
  owns: (key: string) => boolean
): WorkspaceStorage {
  const keys = () =>
    Array.from({ length: storage.length }, (_, index) =>
      storage.key(index)
    ).filter((key): key is string => key !== null && owns(key));
  return {
    get length() {
      return keys().length;
    },
    key(index) {
      return keys()[index] ?? null;
    },
    getItem(key) {
      return owns(key) ? storage.getItem(key) : null;
    },
    setItem(key, value) {
      if (!owns(key))
        throw new Error("Storage key belongs to another workspace");
      storage.setItem(key, value);
    },
    removeItem(key) {
      if (owns(key)) storage.removeItem(key);
    },
  };
}

/** A minimal persistence backend for snapshot reads and writes. */
export interface WorkspaceSnapshotStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Debounced, caller-validated snapshots scoped to one workspace and storage key. */
export class WorkspaceSnapshotStore<Snapshot> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  readonly debounceMs: number;
  private readonly storage: () => WorkspaceSnapshotStorage | null;
  private readonly key: string;
  private readonly accepts: (value: unknown) => value is Snapshot;

  constructor(options: {
    storage: () => WorkspaceSnapshotStorage | null;
    key: string;
    accepts: (value: unknown) => value is Snapshot;
    debounceMs?: number;
  }) {
    this.storage = options.storage;
    this.key = options.key;
    this.accepts = options.accepts;
    this.debounceMs = options.debounceMs ?? 1000;
  }

  private write(snapshot: Snapshot): void {
    try {
      this.storage()?.setItem(this.key, JSON.stringify(snapshot));
    } catch {
      // Storage may be restricted, full, or unavailable during SSR.
    }
  }

  /** Replace the pending snapshot with a debounced write. */
  schedule(snapshot: Snapshot): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.write(snapshot);
    }, this.debounceMs);
  }

  /** Cancel a pending write and persist immediately. */
  flush(snapshot: Snapshot): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.write(snapshot);
  }

  /** Cancel a pending write without changing the stored snapshot. */
  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Restore only JSON accepted by the host's snapshot contract. */
  restore(): Snapshot | null {
    try {
      const raw = this.storage()?.getItem(this.key);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      return this.accepts(value) ? value : null;
    } catch {
      return null;
    }
  }
}
